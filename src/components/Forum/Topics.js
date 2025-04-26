import { Link, useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { apiRequest } from "../Utils";
import { Trash2, Edit3 } from "lucide-react";
import Swal from "sweetalert2";

const Topics = ({ token, user, darkMode }) => {
    const { subforumId } = useParams();
    const [topics, setTopics] = useState([]);
    const [newTopic, setNewTopic] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiRequest(`forum/topics/${subforumId}`, "GET", token)
            .then(data => {
                setTopics(data);
                setLoading(false);
            })
            .catch(err => console.error("Error fetching topics:", err));
    }, [subforumId, token]);

    const handleCreateTopic = () => {
        if (user?.isMuted) {
            Swal.fire("Muted", "You are muted and cannot create new topics.", "warning");
            return;
        }

        if (!newTopic.trim()) return;

        apiRequest(`forum/subforums/${subforumId}/topics`, "POST", token, { title: newTopic })
            .then(data => {
                setTopics([...topics, data]);
                setNewTopic("");
            })
            .catch(err => console.error("Error creating topic:", err));
    };

    const handleDeleteTopic = (topicId, authorId) => {
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
                apiRequest(`forum/topics/${topicId}`, "DELETE", token)
                    .then(() => {
                        setTopics(topics.filter(topic => topic.id !== topicId));
                        Swal.fire("Deleted!", "The topic has been deleted.", "success");
                    })
                    .catch(err => console.error("Error deleting topic:", err));
            }
        });
    };

    const handleEditTopic = (topic) => {
        Swal.fire({
            title: "Edit Topic",
            input: "text",
            inputValue: topic.title,
            showCancelButton: true,
            confirmButtonText: "Save",
            preConfirm: (newTitle) => {
                if (!newTitle.trim()) {
                    Swal.showValidationMessage("Topic title cannot be empty");
                    return false;
                }
                return newTitle;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                apiRequest(`forum/topics/${topic.id}`, "PUT", token, { title: result.value })
                    .then(() => {
                        setTopics(topics.map(t => t.id === topic.id ? { ...t, title: result.value } : t));
                        Swal.fire("Updated!", "The topic has been updated.", "success");
                    })
                    .catch(err => console.error("Error updating topic:", err));
            }
        });
    };
    if (loading) return <p className="text-center text-light">Loading topics...</p>;

    return (
        <div className="container mt-4">
            <Link to="/forum" className="btn btn-secondary mb-3">← Back</Link>
            <h2 className="text-warning">Topics</h2>
            <ul className="list-group">
                {topics.map(topic => (
                    <li key={topic.id} className={`list-group-item ${darkMode ? "bg-dark" : "bg-light"} text-light d-flex justify-content-between align-items-center`}>
                        <Link to={`/forum/${subforumId}/topic/${topic.id}`} className="text-warning flex-grow-1">
                            {topic.title}
                        </Link>
                        {(user?.roles.includes("admin") || user?.id === topic.userId) && (
                            <div>
                                <button className="btn btn-sm btn-warning me-2" onClick={() => handleEditTopic(topic)}>
                                    <Edit3 size={18} />
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteTopic(topic.id, topic.authorId)}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
            <div className="mt-3">
                <input
                    type="text"
                    className={`form-control ${darkMode ? "bg-dark text-light" : "bg-light text-dark"}`}
                    placeholder="Create a new topic..."
                    value={newTopic}
                    onChange={e => setNewTopic(e.target.value)}
                />
                <button className="btn btn-primary mt-2" onClick={handleCreateTopic}>Post</button>
            </div>
        </div>
    );
};

export { Topics };