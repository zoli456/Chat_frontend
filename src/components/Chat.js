import React, { useState, useEffect, useRef } from "react";
import {Container, Card, Form, Button} from "react-bootstrap";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Picker from "emoji-picker-react";
import {Gavel, LogOut, Trash2, Volume2, VolumeOff} from "lucide-react";
import { apiRequest } from "./Utils.js";
import "./Chat.css";
import Swal from "sweetalert2";
const Chat = ({ token, user, setToken,socket, darkMode }) => {
    const showAlert = (title, text, icon) => {
        Swal.fire({ title, text, icon });
    };
    const showConfirm = async (title, text, confirmButtonText) => {
        const result = await Swal.fire({
            title,
            text,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText,
            cancelButtonText: "Cancel",
        });
        return result.isConfirmed;
    };
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [typing, setTyping] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const chatEndRef = useRef(null);
    const navigate = useNavigate();
    const [isMuted, setIsMuted] = useState(false);
    const emojiPickerRef = useRef();
    const emojiButtonRef = useRef();

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }

        let decodedUser;
        try {
            decodedUser = jwtDecode(token);
            if (!decodedUser || decodedUser.exp * 1000 < Date.now()) {
                throw new Error("Token expired");
            }
        } catch (error) {
            console.error("Invalid or expired token:", error);
            localStorage.removeItem("token");
            setToken(null);
            navigate("/login");
            return;
        }

        const fetchMessages = async () => {
            try {
                const data = await apiRequest("messages", "GET", token);
                setMessages(data);
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            } catch (error) {
                localStorage.removeItem("token");
                setToken(null);
                navigate("/login");
            }
        };

        fetchMessages();

        if (socket) socket.emit("entered_chat");

        socket.on("chat_message", (msg) => {
            setMessages((prev) => [...prev, msg].slice(-30)); // Keep last 30 messages
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        });

        socket.on("chat_typing", (username) => {
            if (username !== user.username) {
                setTyping(username);
                setTimeout(() => setTyping(null), 3000);
            }
        });

        socket.on("chat_update_users", (users) => {
            setOnlineUsers(users);
        });
        socket.on("chat_message_deleted", ({ id }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id.toString() === id.toString() ? { ...msg, fading: true } : msg
                )
            );
            setTimeout(() => {
                setMessages((prev) => prev.filter((msg) => msg.id.toString() !== id.toString()));
            }, 500);
        });

        socket.on("notify_user_muted", ({ userId:mutedUserId, reason, expiresAt }) => {
            if (mutedUserId == user.id) {
                setIsMuted(true);
                Swal.fire("You have been muted", `Reason: ${reason}. Ends: ${expiresAt ? new Date(expiresAt).toLocaleString() : "Permanent"}`, "error");
            }
            if (user?.roles?.includes("admin")) {
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.User.userId == mutedUserId ? { ...msg, User: { ...msg.User, isMuted: true } } : msg
                    )
                );
            }
        });
        socket.on("notify_user_banned", ({ userId:bannedUserId, reason, expiresAt }) => {
            if (user?.roles?.includes("admin")) {
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.User.userId == bannedUserId ? { ...msg, User: { ...msg.User, isBanned: true } } : msg
                    )
                );
            }
        });

        socket.on("user_unmuted", ({ userId }) => {
            if (userId == user.id) {
                showAlert("Unmuted", "You have been unmuted.", "success");
                setIsMuted(false);
            }
            if (user?.roles?.includes("admin")) {
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.User.userId == userId ? { ...msg, User: { ...msg.User, isMuted: false } } : msg
                    )
                );
            }
        });

        socket.on("user_unbanned", ({ userId }) => {
            if (user?.roles?.includes("admin")) {
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.User.userId == userId ? { ...msg, User: { ...msg.User, isBanned: false } } : msg
                    )
                );
            }
        });

        return () => {
            socket.off("chat_message");
            socket.off("chat_typing");
            socket.off("chat_update_users");
            socket.off("chat_message_deleted");
            socket.off("notify_user_banned");
            socket.off("notify_user_muted");
            socket.off("user_unmuted");
            socket.off("user_unbanned");
           // socket.on.disconnect();
        };
    }, [token, navigate, setToken, user.id]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside both picker and button
            if (emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target) &&
                !emojiButtonRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    const sendMessage = async () => {
        if (isMuted) {
            Swal.fire("You cant send messages", `You are muted and cannot send messages.`, "error");
            return;
        }
        if (message.trim()) {
            try {
                const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/messages`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ text: message }),
                });
                if (!response.ok) throw new Error("Failed to send message");
                setMessage("");
                const textarea = document.querySelector("textarea");
                if (textarea) {
                    textarea.style.height = "auto";
                }
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            } catch (error) {
                console.error("Error sending message:", error);
            }
        }
    };

    const muteUser = async (userId) => {
        const reasonResult = await Swal.fire({
            title: "Mute User",
            input: "text",
            inputLabel: "Enter reason",
            showCancelButton: true,
        });
        if (reasonResult.isDismissed) {return;}

        const durationResult = await Swal.fire({
            title: "Mute Duration",
            input: "number",
            inputLabel: "Enter duration in minutes (leave empty for permanent)",
            showCancelButton: true,
        });
        if (durationResult.isDismissed) {return;}

        const reason = reasonResult.value;
        const duration = durationResult.value;

        if (duration && (isNaN(duration) || duration <= 0)) {
            showAlert("Invalid Input", "Please enter a valid number of minutes.", "error");
            return;
        }

        try {
            await apiRequest(`admin/mute/${userId}`, "POST", token, { reason, duration });
            showAlert("User Muted", `User has been muted for ${duration ? duration + " minutes" : "permanently"}.`, "success");
        } catch (error) {
            console.error("Error muting user:", error);
        }
    };


    const deleteMessage = async (id) => {
        const confirmed = await showConfirm("Delete Message", "Are you sure you want to delete this message?", "Delete");
        if (!confirmed) return;
        try {
            await apiRequest(`messages/${id}`, "DELETE", token);
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };

    const unmuteUser = async (userId) => {
        const confirmed = await showConfirm("Unmute User", "Are you sure you want to unmute this user?", "Unmute");
        if (!confirmed) return;
        try {
            await apiRequest(`admin/unmute/${userId}`, "POST", token);
            showAlert("User Unmuted", "User has been unmuted.", "success");
        } catch (error) {
            console.error("Error unmuting user:", error);
        }
    };

    const kickUser = async (userId) => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "Do you really want to kick this user?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, kick!",
            cancelButtonText: "Cancel"
        });

        if (result.isConfirmed) {
            try {
                await apiRequest(`admin/kick/${userId}`, "POST", token);
                Swal.fire("Success", "User has been kicked from the chat.", "success");
            } catch (error) {
                console.error("Error kicking user:", error);
            }
        }
    };

    const banUser = async (userId) => {
        const reasonResult = await Swal.fire({
            title: "Ban User",
            input: "text",
            inputLabel: "Enter reason",
            showCancelButton: true,
        });
        if (reasonResult.isDismissed) {return;}

        const durationResult = await Swal.fire({
            title: "Ban Duration",
            input: "number",
            inputLabel: "Enter duration in minutes (leave empty for permanent)",
            showCancelButton: true,
        });
        if (durationResult.isDismissed) {return;}

        const reason = reasonResult.value;
        const duration = durationResult.value;

        if (duration && (isNaN(duration) || duration <= 0)) {
            showAlert("Invalid Input", "Please enter a valid number of minutes.", "error");
            return;
        }
            try {
                await apiRequest(`admin/ban/${userId}`, "POST", token, { reason, duration: duration });
                Swal.fire("Success", `User has been banned for ${duration ? duration + " minutes" : "permanently"}.`, "success");
            } catch (error) {
                console.error("Error banning user:", error);
            }
        };

    const unbanUser = async (userId) => {
        const confirmed = await showConfirm("Unban User", "Are you sure you want to unban this user?", "Unban");
        if (!confirmed) return;

        try {
            await apiRequest(`admin/unban/${userId}`, "POST", token);
            showAlert("User Unbanned", "User has been unbanned.", "success");
        } catch (error) {
            console.error("Error unbanning user:", error);
        }
    };

    const handleTypingEvent = () => {
        socket.emit("chat_typing", user.username);
    };

    const onEmojiClick = (emojiData) => {
        setMessage((prevMessage) => prevMessage + emojiData.emoji);
    };

    return (
        <Container className="mt-5">
            <Card className="p-4">
                <div className="d-flex justify-content-between">
                    <h2>Chat Room</h2>
                </div>
                <div className="chat-box">
                    {messages.map((msg, index) => (
                        <Card key={index} className={`mb-2 p-2 position-relative ${msg.fading ? "fade-out" : "fade-in"}`}>
                            <div className="d-flex align-items-center justify-content-between">
                                <strong>{msg.User?.username}</strong>
                                <div className="d-flex gap-2">
                                    {user?.roles?.includes("admin") && msg.User?.username !== user.username && (
                                        <>
                                            {msg.User?.isMuted ? (
                                                <Button variant="success" size="sm" onClick={() => unmuteUser(msg?.User.userId)}>
                                                    <Volume2 size={16} />
                                                </Button>
                                            ) : (
                                                <Button variant="warning" size="sm" onClick={() => muteUser(msg?.User.userId)}>
                                                    <VolumeOff size={16} />
                                                </Button>
                                            )}
                                            <Button variant="danger" size="sm" onClick={() => kickUser(msg?.User.userId)}><LogOut size={16} /></Button>
                                            {msg.User?.isBanned ? (
                                                <Button variant="success" size="sm" onClick={() => unbanUser(msg?.User.userId)}>
                                                    <Gavel size={16} style={{ transform: "rotate(180deg)" }} />
                                                </Button>
                                            ) : (
                                                <Button variant="dark" size="sm" onClick={() => banUser(msg?.User.userId)}>
                                                    <Gavel size={16} />
                                                </Button>
                                            )}
                                        </>
                                    )}

                                    {(msg.User?.username === user?.username || user?.roles?.includes("admin")) && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            className="delete-button"
                                            disabled={isMuted}
                                            onClick={() => deleteMessage(msg.id)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="message-text text-break">{msg.text}</div>
                            <span className="message-timestamp text-muted">{new Date(msg.createdAt).toLocaleString()}</span>
                        </Card>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                <div className="d-flex align-items-center mt-2" style={{ position: "relative" }}>
                    <Button
                        variant="secondary"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        disabled={isMuted}
                        ref={emojiButtonRef}
                    >
                        😀
                    </Button>
                    <Form.Control
                        as="textarea"
                        rows={1}
                        className={`mx-2 ${darkMode ? "bg-dark text-light" : "bg-light text-dark"}`}
                        value={message}
                        onChange={(e) => {
                            if (!isMuted && e.target.value.length <= 512) {
                                setMessage(e.target.value);
                                handleTypingEvent();
                                e.target.style.height = "auto";
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }
                        }}
                        onKeyDown={(e) => {
                            if (!isMuted && e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder={isMuted ? "You are muted and cannot send messages." : "Type a message... (Shift + Enter for new line)"}
                        style={{ resize: "none", overflow: "hidden", maxHeight: "150px" }}
                        disabled={isMuted}
                    />
                    {showEmojiPicker && (
                        <div
                            className="emoji-picker-container"
                            ref={emojiPickerRef}
                            style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: 0,
                                zIndex: 1000
                            }}
                        >
                            <Picker onEmojiClick={onEmojiClick} />
                        </div>
                    )}
                    <Button className="ml-2" onClick={sendMessage} disabled={isMuted}>
                        Send
                    </Button>
                </div>
            </Card>
            <Card className="p-3 mt-3">
                <h5>Online Users ({onlineUsers.length})</h5>
                <div>
                    {onlineUsers.map((username, index) => (
                        <span key={index} style={{ fontWeight: typing === username ? "bold" : "normal" }}>
                            {username}{index !== onlineUsers.length - 1 ? ", " : ""}
                        </span>
                    ))}
                </div>
            </Card>
        </Container>
    );
};

export default Chat;