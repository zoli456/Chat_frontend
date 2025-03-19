import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {ToastContainer} from "react-toastify";
import { io } from "socket.io-client";
import "react-toastify/dist/ReactToastify.css";
import { apiRequest } from "./Utils";
import {useNavigate} from "react-router-dom";
import "./DMessages.css";

const socket = io("http://localhost:5000", { transports: ["websocket"] });

const DMessages = ({ token }) => {
    const [messages, setMessages] = useState([]);
    const [view, setView] = useState("incoming");
    const [newMessage, setNewMessage] = useState({ recipient: "", subject: "", content: "" });
    const navigate = useNavigate();
    const [charCount, setCharCount] = useState(0);
    useEffect(() => {
        if (!token) {
            navigate("/login");
        }
    },[token])

    useEffect(() => {
        if (view !== "new") {
            fetchMessages(view);
        }
    }, [view]);

    const fetchMessages = async (type) => {
        try {
            const data = await apiRequest(`dmessages/${type}`, "GET", token);
            setMessages(data);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const markAsViewed = async (msgId) => {
        try {
            await apiRequest(`dmessages/${msgId}/view`, "POST", token);
            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg.id === msgId ? { ...msg, viewed: true } : msg
                )
            );
        } catch (error) {
            console.error("Error marking message as viewed:", error);
        }
    };

    const deleteMessage = async (msgId) => {
        try {
            await apiRequest(`dmessages/${msgId}`, "DELETE", token);
            setMessages(messages.filter((msg) => msg.id !== msgId));
            Swal.fire("Deleted!", "Message has been deleted.", "success");
        } catch (error) {
            Swal.fire("Error", "Failed to delete message.", "error");
        }
    };

    const showMessage = (msg) => {
        markAsViewed(msg.id);
        Swal.fire({
            title: msg.subject,
            html: `
            <p><strong>From:</strong> ${msg.Sender?.username || msg.Recipient?.username}</p>
            <p><strong>Date:</strong> ${new Date(msg.createdAt).toLocaleString()}</p>
            <hr>
            <p>${msg.content}</p>
        `,
            confirmButtonText: "Close",
            showCancelButton: true,
            cancelButtonText: "Delete",
            width: "700px"
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.cancel) {
                deleteMessage(msg.id);
            }
        });
    };

    const handleMessageChange = (e) => {
        const value = e.target.value;
        if (value.length <= 2000) {
            setNewMessage({ ...newMessage, content: value });
            setCharCount(value.length);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        try {
            const sentMessage = await apiRequest("dmessages", "POST", token, newMessage);
            setNewMessage({ recipient: "", subject: "", content: "" });
            socket.emit("sendMessage", sentMessage);
            Swal.fire("Success", "Message sent!", "success");
        } catch (error) {
            Swal.fire("Error", "Failed to send message.", "error");
        }
    };

    return (
        <div className="container mt-5">
            <ToastContainer />
            <h1>Messages</h1>
            <div className="mb-3">
                <button className="btn btn-primary me-2" onClick={() => setView("incoming")}>Incoming</button>
                <button className="btn btn-secondary me-2" onClick={() => setView("outgoing")}>Outgoing</button>
                <button className="btn btn-success" onClick={() => setView("new")}>Write New</button>
            </div>
            {view === "incoming" || view === "outgoing" ? (
                <ul className="list-group">
                    {messages.map((msg) => (
                        <li
                            key={msg.id}
                            className={`list-group-item d-flex justify-content-between align-items-center ${msg.viewed ? '' : 'fw-bold'}`}
                            onClick={() => showMessage(msg)}
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
            ) : (
                <form onSubmit={handleSendMessage}>
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
                        <textarea
                            className="form-control"
                            value={newMessage.content}
                            onChange={handleMessageChange}
                            required
                            style={{ height: "auto", minHeight: "100px", overflow: "hidden" }}
                            onInput={(e) => {
                                e.target.style.height = "auto";
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                        />
                        <small className="text-muted">{charCount}/2000</small>
                    </div>
                    <button type="submit" className="btn btn-primary">Send</button>
                </form>
            )}
        </div>
    );
};

export default DMessages;