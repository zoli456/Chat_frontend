import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, decodeHtml } from "../Utils";
import { Edit3, MessageSquareQuote, Smile, Trash2, X } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { AnimatePresence, motion } from "framer-motion";
import Swal from "sweetalert2";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const TopicDiscussion = ({ token, user, socket }) => {
    const { subforumId, topicId } = useParams();
    const [topic, setTopic] = useState(null);
    const [posts, setPosts] = useState([]);
    const charCountRef = useRef(0);
    const [editingPost, setEditingPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const postsPerPage = 30;
    const stableModules = {
        toolbar: [
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ script: "sub" }, { script: "super" }],
            ["link", "video"],
            ["clean"],
        ],
        clipboard: { matchVisual: false },
    };

    const stableFormats = ["bold", "italic", "underline", "strike", "list", "link", "video"];

    const quillRef = useRef(null);
    const quillInstance = useRef(null);
    const initializedRef = useRef(false);

    // Initialize Quill editor
    useEffect(() => {
        if (quillRef.current && !initializedRef.current) {
            initializedRef.current = true;

            const editor = new Quill(quillRef.current, {
                theme: "snow",
                modules: stableModules,
                formats: stableFormats,
            });
            quillInstance.current = editor;

            const handleTextChange = () => {
                const length = editor.getText().trim().length;
                charCountRef.current = length;
                setCharCount(length);
            };

            editor.on("text-change", handleTextChange);

            return () => {
                if (quillInstance.current) {
                    // Get the editor instance directly from the ref
                    const currentEditor = quillInstance.current;
                    currentEditor.off("text-change", handleTextChange);

                    // Remove Quill's DOM elements
                    const container = quillRef.current;
                    if (container) {
                        const parent = container.parentNode;
                        if (parent) {
                            parent.removeChild(container);
                            const newContainer = document.createElement('div');
                            newContainer.className = 'quill-editor';
                            parent.appendChild(newContainer);
                            quillRef.current = newContainer;
                        }
                    }

                    quillInstance.current = null;
                    initializedRef.current = false;
                }
            };
        }
    }, []);

    const [charCount, setCharCount] = useState(0);

    const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

    const pickerRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target) && !buttonRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setLoading(true);
        apiRequest(`forum/topics/${topicId}/posts?page=${currentPage}&limit=${postsPerPage}`, "GET", token)
            .then(data => {
                setTopic(data.topic || {});
                setPosts(Array.isArray(data.posts) ? data.posts : []);
                setTotalPages(data.totalPages || 1);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching topic:", err);
                setLoading(false);
            });

        if (socket) {
            socket.emit("joinTopic", topicId);
            socket.on("newPost", (post) => {
                setPosts((prevPosts) => {
                    const updatedPosts = [...prevPosts, { ...post, justAdded: true }];
                    // Ensure we don't exceed the max allowed comments
                    if (updatedPosts.length > postsPerPage) {
                        updatedPosts.shift(); // Remove the oldest comment
                    }

                    return updatedPosts;
                });

                setTimeout(() => {
                    setPosts((prevPosts) => prevPosts.map((p) => ({ ...p, justAdded: false })));
                }, 1000);
            });

            socket.on("updatePost", ({ updatedPost }) => {
                setPosts((prevPosts) =>
                    prevPosts.map((p) =>
                        p.id === updatedPost.id ? { ...updatedPost, justEdited: true } : p
                    )
                );
                setTimeout(() => {
                    setPosts((prevPosts) =>
                        prevPosts.map((p) =>
                            p.id === updatedPost.id ? { ...p, justEdited: false } : p
                        )
                    );
                }, 1000);
            });

            socket.on("deletePost", (postId) => {
                setPosts((prevPosts) =>
                    prevPosts.map((p) => (p.id == postId ? { ...p, deleting: true } : p))
                );
                setTimeout(() => {
                    setPosts((prevPosts) => prevPosts.filter((p) => p.id != postId));
                }, 300);
            });

            return () => {
                socket.emit("leaveTopic", topicId);
                socket.off("newPost");
                socket.off("updatePost");
                socket.off("deletePost");
            };
        }
    }, [topicId, token, socket, currentPage]);


    const handlePostReply = () => {
        if (user?.isMuted) {
            Swal.fire("Muted", "You are currently muted and cannot post messages.", "warning");
            return;
        }

        if (!quillInstance.current) return;

        const textAreaValue = quillInstance.current.root.innerHTML.trim();
        const plainText = quillInstance.current.getText().trim();

        if (plainText.length < 3 || plainText.length > 1000) {
            Swal.fire("Error", "Message must be between 3 and 1000 characters.", "error");
            return;
        }

        if (editingPost) {
            apiRequest(`forum/posts/${editingPost.id}`, "PUT", token, { content: textAreaValue })
                .then(() => {
                    socket.emit("editPost", { ...editingPost, content: textAreaValue });
                    setEditingPost(null);
                    quillInstance.current.root.innerHTML = "";
                    setCharCount(0);
                });
        } else {
            apiRequest(`forum/topics/${topicId}/posts`, "POST", token, { content: textAreaValue })
                .then((data) => {
                    socket.emit("newPost", { ...data, User: { username: user.username } });
                    quillInstance.current.root.innerHTML = "";
                    setCharCount(0);
                });
        }
    };


    const handleDeletePost = (postId) => {
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                apiRequest(`forum/posts/${postId}`, "DELETE", token)
                    .then(() => {
                        socket.emit("deletePost", postId);
                        Swal.fire("Deleted!", "The post has been deleted.", "success");
                    })
                    .catch(err => console.error("Error deleting post:", err));
            }
        });
    };

    const cancelEdit = () => {
        setEditingPost(null);
        if (quillInstance.current) quillInstance.current.root.innerHTML = "";
    };
    const handleEditPost = (post) => {
        setEditingPost(post);
        if (quillInstance.current) {
            quillInstance.current.clipboard.dangerouslyPasteHTML(decodeHtml(post.content));
            setTimeout(() => quillInstance.current.setSelection(quillInstance.current.getLength()), 100); // Move cursor to end
        }
    };

    const handleEmojiClick = (emojiObject) => {
        if (quillInstance.current) {
            const range = quillInstance.current.getSelection();
            const position = range ? range.index : quillInstance.current.getLength();
            quillInstance.current.insertText(position, emojiObject.emoji);
            quillInstance.current.setSelection(position + emojiObject.emoji.length); // Maintain cursor position
        }
    };

    const handleQuotePost = (post) => {
        if (quillInstance.current) {
            const quotedContent = `
            <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; margin: 5px 0; color: #666;">
                ${decodeHtml(post.content)}
            </blockquote>
            <p><br></p>
        `;

            const range = quillInstance.current.getSelection();
            const position = range ? range.index : quillInstance.current.getLength();
            quillInstance.current.clipboard.dangerouslyPasteHTML(position, quotedContent);
            quillInstance.current.setSelection(position + 1); // Move cursor after quote
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="text-warning">{topic?.title}</h2>
            <Link to={`/forum/${subforumId}`} className="btn btn-secondary mb-3">Back to Topics</Link>

            <div className={`card p-3`}>
                {loading ? (
                    <p className="text-center text-light">Loading posts...</p>
                ) : (
                    <AnimatePresence>
                        {posts.length > 0 ? (
                            posts.map((post) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                                className="border-bottom pb-2 mb-2 d-flex justify-content-between align-items-center"
                                style={{ backgroundColor: post.justEdited ? "#fffa90" : "inherit" }}
                            >
                                <div>
                                    <strong className="text-info">{post.User?.username}</strong>
                                    <div dangerouslySetInnerHTML={{ __html: decodeHtml(post.content) }} />
                                    <small className="text-muted">
                                        {new Date(post.createdAt).toLocaleString()}
                                        {post.updatedAt &&
                                            new Date(post.updatedAt).getTime() !==
                                            new Date(post.createdAt).getTime() && (
                                                <span>
                                                {" "}
                                                    (edited: {new Date(post.updatedAt).toLocaleString()})
                                            </span>
                                            )}
                                    </small>
                                </div>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-sm btn-info" onClick={() => handleQuotePost(post)}>
                                        <MessageSquareQuote size={18} />
                                    </button>
                                    {(user?.roles.includes("admin") || user?.id === post.userId) && (
                                        <>
                                            <button className="btn btn-sm btn-warning" onClick={() => handleEditPost(post)}>
                                                <Edit3 size={18} />
                                            </button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDeletePost(post.id)}>
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                            ))
                        ) : (
                            <p className="text-muted">No posts yet. Be the first to reply!</p>
                        )}
                    </AnimatePresence>
                )}
            </div>

            <div className="mt-3 position-relative">
                <div ref={quillRef} className="quill-editor" />
                <button
                    ref={buttonRef}
                    className="btn btn-light mt-2 me-2"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                    <Smile size={20} />
                </button>

                {showEmojiPicker && (
                    <div
                        ref={pickerRef}
                        className="position-absolute"
                        style={{ top: "90px", left: "10px", zIndex: 1000 }}
                    >
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                )}
                <button className="btn btn-primary mt-2 me-2" onClick={handlePostReply}>{editingPost ? "Save" : "Reply"}</button>
                {editingPost && <button className="btn btn-secondary mt-2 me-2" onClick={cancelEdit}><X size={20} /> Cancel</button>}
                <small className="text-muted">{charCount}/512</small>
            </div>

            {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-3">
                    <button className="btn btn-secondary me-2" onClick={goToPrevPage} disabled={currentPage === 1}>
                        Previous
                    </button>
                    <span className="align-self-center">Page {currentPage} of {totalPages}</span>
                    <button className="btn btn-secondary ms-2" onClick={goToNextPage} disabled={currentPage === totalPages}>
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default TopicDiscussion;