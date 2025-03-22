import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { apiRequest } from "../Utils";
import Swal from "sweetalert2";
import { Trash2, Edit3, Smile, X, MessageSquareQuote } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
const TopicDiscussion = ({ token, user, darkMode }) => {
    const { subforumId, topicId } = useParams();
    const [topic, setTopic] = useState(null);
    const [posts, setPosts] = useState([]);
    const [textAreaValue, setTextAreaValue] = useState("");
    const [editingPost, setEditingPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    useEffect(() => {
        apiRequest(`forum/topics/${topicId}/posts`, "GET", token)
            .then(data => {
                setTopic(data.topic || {});
                setPosts(Array.isArray(data.posts) ? data.posts : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching topic:", err);
                setLoading(false);
            });
    }, [topicId, token]);
    const handlePostReply = () => {
        if (textAreaValue.length < 3 || textAreaValue.length > 1000) {
            Swal.fire("Error", "Message must be between 3 and 1000 characters.", "error");
            return;
        }
        if (editingPost) {
            apiRequest(`forum/posts/${editingPost.id}`, "PUT", token, { content: textAreaValue })
                .then(() => {
                    setPosts(posts.map(p => p.id === editingPost.id ? { ...p, content: textAreaValue } : p));
                    setEditingPost(null);
                    setTextAreaValue("");
                })
                .catch(err => console.error("Error updating post:", err));
        } else {
            apiRequest(`forum/topics/${topicId}/posts`, "POST", token, { content: textAreaValue })
                .then(data => {
                    setPosts([...posts, { ...data, User: { username: user.username } }]);
                    setTextAreaValue("");
                })
                .catch(err => console.error("Error posting reply:", err));
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
                        setPosts(posts.filter(post => post.id !== postId));
                        Swal.fire("Deleted!", "The post has been deleted.", "success");
                    })
                    .catch(err => console.error("Error deleting post:", err));
            }
        });
    };

    const handleEditPost = (post) => {
        setEditingPost(post);
        setTextAreaValue(post.content);
    };

    const cancelEdit = () => {
        setEditingPost(null);
        setTextAreaValue("");
    };

    const handleEmojiClick = (emojiObject) => {
        setTextAreaValue(prev => prev + emojiObject.emoji);
    };

    const handleQuotePost = (post) => {
        setTextAreaValue(`> ${post.content}\n\n`);
    }

    if (loading) return <p className="text-center text-light">Loading topic...</p>;
    return (
        <div className="container mt-4">
            <h2 className="text-warning">{topic?.title}</h2>
            <Link to={`/forum/${subforumId}`} className="btn btn-secondary mb-3">Back to Topics</Link>
            <div className={`card ${darkMode ? "bg-dark" : "bg-light"} text-light p-3`}>
                {posts.length > 0 ? (
                    posts.map(post => (
                        <div key={post.id} className="border-bottom pb-2 mb-2 d-flex justify-content-between align-items-center">
                            <div>
                                <strong className="text-info">{post.User?.username}</strong>
                                <p style={{ wordBreak: "break-word" }}>{post.content}</p>
                                <small className="text-muted">{new Date(post.createdAt).toLocaleString()}</small>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-info" onClick={() => handleQuotePost(post)}>
                                    <MessageSquareQuote size={18} />
                                </button>
                                {(user?.roles.includes('admin') || user?.id === post.userId) && (
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
                        </div>
                    ))
                ) : (
                    <p className="text-muted">No posts yet. Be the first to reply!</p>
                )}
            </div>
            <div className="mt-3 position-relative">
                <textarea
                    className={`form-control ${darkMode ? "bg-dark" : "bg-light"} text-light`}
                    rows="3"
                    placeholder={editingPost ? "Edit your post..." : "Write a reply..."}
                    value={textAreaValue}
                    onChange={e => setTextAreaValue(e.target.value)}
                />
                <button className="btn btn-light mt-2 me-2" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                    <Smile size={20} />
                </button>
                {showEmojiPicker && (
                    <div className="position-absolute" style={{ zIndex: 10 }}>
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                )}
                <button className="btn btn-primary mt-2 me-2" onClick={handlePostReply}>{editingPost ? "Save" : "Reply"}</button>
                {editingPost && <button className="btn btn-secondary mt-2" onClick={cancelEdit}><X size={20} /> Cancel</button>}
                <small className="text-muted">{textAreaValue.length}/1000</small>
            </div>
        </div>
    );
};

export default TopicDiscussion;
