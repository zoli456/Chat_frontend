import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest, decodeHtml } from "./Utils";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import "react-toastify/dist/ReactToastify.css";
import Swal from "sweetalert2";

const DMessages = ({ token, socket }) => {
    const [messages, setMessages] = useState([]);
    const [view, setView] = useState("incoming");
    const [newMessage, setNewMessage] = useState({ recipient: "", subject: "", content: "" });
    const [charCount, setCharCount] = useState(0);
    const [messageDetail, setMessageDetail] = useState(null);
    const navigate = useNavigate();
    const { id } = useParams();
    const [isReply, setIsReply] = useState(false);
    const quillInstance = useRef(null);
    const quillRef = useRef(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10
    });

    const modules = {
        toolbar: [
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ script: "sub" }, { script: "super" }],
            ["link", "video"],
            ["clean"],
        ],
        clipboard: { matchVisual: true },
    };
    const formats = ["bold", "italic", "underline", "strike", "list", "link", "video", "blockquote" ,"p" ,"s", "u"];

    useEffect(() => {
        if (!token) {
            navigate("/login");
        }
    }, [token]);

    useEffect(() => {
        if (view !== "new" && !id) {
            fetchMessages(view, pagination.currentPage);
        }
    }, [view, id, pagination.currentPage]);

    useEffect(() => {
        if (id) {
            fetchMessageDetail(id);
        } else {
            setMessageDetail(null);
        }
    }, [id]);

    useEffect(() => {
        // Setup socket listeners for real-time updates
        if (socket) {
            socket.on("newDirectMessage", handleNewMessage);
            socket.on("directMessageDeleted", handleDeletedMessage);

            return () => {
                socket.off("newDirectMessage", handleNewMessage);
                socket.off("directMessageDeleted", handleDeletedMessage);
            };
        }
    }, [socket, messages]);

    useEffect(() => {
        if (view === "new" && quillRef.current && !quillInstance.current) {
            const editor = new Quill(quillRef.current, {
                modules,
                formats,
                theme: "snow",
            });

            editor.clipboard.dangerouslyPasteHTML(newMessage.content);

            editor.on("text-change", () => {
                const text = editor.getText().trim();
                if (text.length <= 1000) {
                    setNewMessage((prev) => ({ ...prev, content: editor.root.innerHTML }));
                    setCharCount(text.length);
                } else {
                    editor.deleteText(1000, text.length);
                }
            });

            quillInstance.current = editor;
        }

        return () => {
            if (quillInstance.current) {
                quillInstance.current.off("text-change");
                quillInstance.current = null;
                const editorContainer = quillRef.current;
                if (editorContainer) {
                    editorContainer.innerHTML = "";
                }
            }
        };
    }, [view]);

    useEffect(() => {
        if (quillInstance.current && view === "new") {
            const currentContent = quillInstance.current.root.innerHTML;
            if (currentContent !== newMessage.content) {
                quillInstance.current.clipboard.dangerouslyPasteHTML(newMessage.content);
                const text = quillInstance.current.getText().trim();
                setCharCount(text.length);
            }
        }
    }, [newMessage.content, view]);

    const fetchMessages = async (type, page = 1) => {
        try {
            const data = await apiRequest(`dmessages/${type}?page=${page}&limit=${pagination.itemsPerPage}`, "GET", token);
            setMessages(data.messages);
            setPagination({
                ...pagination,
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                totalItems: data.totalItems
            });
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const fetchMessageDetail = async (messageId) => {
        try {
            const data = await apiRequest(`dmessages/message/${messageId}`, "GET", token);
            setMessageDetail(data);
        } catch (error) {
            console.error("Error fetching message:", error);
            navigate("/messages");
        }
    };

    const handleNewMessage = (newMessageData) => {
        // Extract the message from the paginated format
        const receivedMessage = newMessageData.messages?.[0] || newMessageData;

        // Only process if viewing incoming messages
        if (view === "incoming") {
            setMessages(prev => {
                // Check if message already exists
                const exists = prev.some(msg => msg.id === receivedMessage.id);
                if (exists) return prev;

                // Add new message at the beginning
                const updatedMessages = [receivedMessage, ...prev];

                // Don't exceed current page's item count
                if (updatedMessages.length > pagination.itemsPerPage) {
                    return updatedMessages.slice(0, pagination.itemsPerPage);
                }
                return updatedMessages;
            });

            // Update pagination totals
            setPagination(prev => ({
                ...prev,
                totalItems: newMessageData.totalItems || prev.totalItems + 1,
                totalPages: Math.ceil(
                    (newMessageData.totalItems || prev.totalItems + 1) / prev.itemsPerPage
                )
            }));
        }
    };

    const handleDeletedMessage = (deletedMessageId) => {
        setMessages(prev => {
            const newMessages = prev.filter(msg => msg.id != deletedMessageId);

            // If we deleted the last message on the page, don't return empty array
            // The page change below will trigger a refetch
            if (newMessages.length === 0 && pagination.currentPage > 1) {
                return prev;
            }
            return newMessages;
        });

        // Update pagination first
        setPagination(prev => {
            const newTotalItems = Math.max(0, prev.totalItems - 1);
            const newTotalPages = Math.ceil(newTotalItems / prev.itemsPerPage);
            const newCurrentPage = Math.min(prev.currentPage, newTotalPages || 1);

            return {
                ...prev,
                totalItems: newTotalItems,
                totalPages: newTotalPages,
                currentPage: newCurrentPage
            };
        });

        // If viewing the deleted message, navigate back
        if (id === deletedMessageId) {
            navigate("/messages");
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        try {
            await apiRequest("dmessages", "POST", token, newMessage);
            setNewMessage({ recipient: "", subject: "", content: "" });
            setView("outgoing");
            fetchMessages("outgoing", 1); // Refresh outgoing messages
        } catch (error) {
            console.error("Failed to send message:", error);
            Swal.fire({
                icon: 'error',
                title: 'Message Failed',
                text: error?.message || 'Unable to send the message. Please try again later.',
            });
        }
    };

    const deleteMessage = async () => {
        if (!id) return;
        try {
            await apiRequest(`dmessages/${id}`, "DELETE", token);
            navigate("/messages");
        } catch (error) {
            console.error("Failed to delete message:", error);
        }
    };

    const handleReply = () => {
        if (!messageDetail) return;
        setNewMessage({
            recipient: messageDetail.Sender?.username || "",
            subject: messageDetail.subject.startsWith("RE:") ? messageDetail.subject : `RE: ${messageDetail.subject}`,
            content: `<strong>On ${new Date(messageDetail.createdAt).toLocaleString()}, ${messageDetail.Sender?.username} wrote:</strong><br/>
<blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">${decodeHtml(messageDetail.content)}</blockquote><br/><br/>`
        });
        setIsReply(true);
        handleNew();
        setTimeout(() => {
            if (quillInstance.current) {
                quillInstance.current.focus();
                quillInstance.current.setSelection(quillInstance.current.getLength());
            }
        }, 200);
    };

    const handleNew = () => {
        setMessageDetail(null);
        setIsReply(false);
        setView("new");
    };

    const changeView = (newView) => {
        setView(newView);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    return (
        <div className="container mt-5" key={view}>
            <h1>Messages</h1>
            <div className="mb-3">
                {!id && (
                    <>
                        <button
                            className={`btn ${view === "incoming" ? "btn-primary" : "btn-outline-primary"} me-2`}
                            onClick={() => {
                                if (id) navigate("/messages");
                                changeView("incoming");
                            }}
                        >
                            Incoming
                        </button>
                        <button
                            className={`btn ${view === "outgoing" ? "btn-primary" : "btn-outline-primary"} me-2`}
                            onClick={() => {
                                if (id) navigate("/messages");
                                changeView("outgoing");
                            }}
                        >
                            Outgoing
                        </button>
                        <button
                            className="btn btn-success"
                            onClick={() => {
                                if (id) navigate("/messages");
                                handleNew();
                            }}
                        >
                            Write New
                        </button>
                    </>
                )}
            </div>

            {id && messageDetail ? (
                <div>
                    <h2>{messageDetail.subject}</h2>
                    <p><strong>From:</strong> {messageDetail.Sender?.username || messageDetail.Recipient?.username}</p>
                    <p><strong>Date:</strong> {new Date(messageDetail.createdAt).toLocaleString()}</p>
                    <hr />
                    <div dangerouslySetInnerHTML={{ __html: decodeHtml(messageDetail.content) }} />
                    <button className="btn btn-secondary me-2" onClick={() => navigate("/messages")}>
                        Back
                    </button>
                    <button className="btn btn-danger me-2" onClick={deleteMessage}>
                        Delete
                    </button>
                    {view !== "outgoing" && (
                        <button className="btn btn-info me-2" onClick={handleReply}>
                            Reply
                        </button>
                    )}
                </div>
            ) : view === "incoming" || view === "outgoing" ? (
                <>
                    <ul className="list-group">
                        {messages.map((msg) => (
                            <li
                                key={msg.id}
                                className={`list-group-item d-flex justify-content-between align-items-center ${msg.viewed ? '' : 'fw-bold'}`}
                                onClick={() => navigate(`/messages/${msg.id}`)}
                                style={{ cursor: "pointer" }}
                            >
                                <div>
                                    <strong>{view === "incoming" ? msg.Sender?.username : msg.Recipient?.username}</strong>
                                    <br />
                                    <span>{msg.subject}</span>
                                </div>
                                <small className="text-muted">{new Date(msg.createdAt).toLocaleString()}</small>
                            </li>
                        ))}
                    </ul>
                    {pagination.totalPages > 1 && (
                        <nav className="mt-3">
                            <ul className="pagination">
                                <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(1)}>First</button>
                                </li>
                                <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(pagination.currentPage - 1)}>Previous</button>
                                </li>
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (pagination.totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (pagination.currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                                        pageNum = pagination.totalPages - 4 + i;
                                    } else {
                                        pageNum = pagination.currentPage - 2 + i;
                                    }
                                    return (
                                        <li key={pageNum} className={`page-item ${pagination.currentPage === pageNum ? 'active' : ''}`}>
                                            <button className="page-link" onClick={() => handlePageChange(pageNum)}>
                                                {pageNum}
                                            </button>
                                        </li>
                                    );
                                })}
                                <li className={`page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(pagination.currentPage + 1)}>Next</button>
                                </li>
                                <li className={`page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(pagination.totalPages)}>Last</button>
                                </li>
                            </ul>
                        </nav>
                    )}
                    <div className="text-muted mt-2">
                        Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}-
                        {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} messages
                    </div>
                </>
            ) : (
                <form onSubmit={handleSendMessage}>
                    {isReply && messageDetail && (
                        <div className="mb-3 p-3 border rounded bg-light">
                            <div className="mt-2 border-start ps-2 text-muted" dangerouslySetInnerHTML={{ __html: decodeHtml(messageDetail.content) }} />
                        </div>
                    )}

                    <div className="mb-3">
                        <label className="form-label">Recipient</label>
                        <input
                            type="text"
                            className="form-control"
                            value={newMessage.recipient}
                            onChange={(e) => setNewMessage({ ...newMessage, recipient: e.target.value })}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Subject</label>
                        <input
                            type="text"
                            className="form-control"
                            value={newMessage.subject}
                            onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Message</label>
                        <div ref={quillRef} className="quill-editor" />
                    </div>
                    <button type="submit" className="btn btn-primary mt-2 me-2">Send</button>
                    <small className="text-muted">{charCount}/1000</small>
                </form>
            )}
        </div>
    );
};

export default DMessages;