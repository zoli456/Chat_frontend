import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../Utils";
import { Plus, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

const Forum = ({ token, user, darkMode }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        apiRequest("forum/categories", "GET", token)
            .then(data => {
                setCategories(data);
                setLoading(false);
            })
            .catch(err => console.error("Error fetching categories:", err));
    }, [token]);
    const handleCreateCategory = () => {
        Swal.fire({
            title: "Create New Category",
            input: "text",
            inputLabel: "Category Name",
            showCancelButton: true,
            confirmButtonText: "Create",
            preConfirm: async (name) => {
                if (!name) {
                    Swal.showValidationMessage("Category name is required");
                    return false;
                }
                try {
                    const response = await apiRequest("forum/categories", "POST", token, { name });
                    setCategories([...categories, response]);
                    Swal.fire("Success", "Category created!", "success");
                } catch (err) {
                    Swal.fire("Error", "Failed to create category", "error");
                }
            }
        });
    };
    const handleCreateSubforum = (forumId) => {
        Swal.fire({
            title: "Create New Subforum",
            html: `<input id="swal-name" class="swal2-input" placeholder="Subforum Name"><textarea id="swal-description" class="swal2-textarea" placeholder="Description"></textarea>`,
            showCancelButton: true,
            confirmButtonText: "Create",
            preConfirm: async () => {
                const name = document.getElementById("swal-name").value;
                const description = document.getElementById("swal-description").value;
                if (!name) {
                    Swal.showValidationMessage("Subforum name is required");
                    return false;
                }
                try {
                    const response = await apiRequest(`forum/categories/${forumId}/subforums`, "POST", token, { name, description });
                    setCategories(categories.map(category =>
                        category.id === forumId ? { ...category, subforums: [...category.subforums, response] } : category
                    ));
                    Swal.fire("Success", "Subforum created!", "success");
                } catch (err) {
                    Swal.fire("Error", "Failed to create subforum", "error");
                }
            }
        });
    };
    const handleRemoveSubforum = (forumId, subforumId) => {
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "No, cancel!",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiRequest(`forum/categories/${forumId}/subforums/${subforumId}`, "DELETE", token);
                    setCategories(categories.map(category =>
                        category.id === forumId ? { ...category, subforums: category.subforums.filter(sub => sub.id !== subforumId) } : category
                    ));
                    Swal.fire("Deleted!", "Subforum has been removed.", "success");
                } catch (err) {
                    Swal.fire("Error", "Failed to delete subforum", "error");
                }
            }
        });
    };
    const handleEditSubforum = (forumId, subforum) => {
        Swal.fire({
            title: "Edit Subforum",
            html: `
        <input id="swal-name" class="swal2-input" placeholder="Subforum Name" value="${subforum.name}">
        <textarea id="swal-description" class="swal2-textarea" placeholder="Description">${subforum.description}</textarea>`,
            showCancelButton: true,
            confirmButtonText: "Save",
            preConfirm: async () => {
                const name = document.getElementById("swal-name").value;
                const description = document.getElementById("swal-description").value;
                if (!name) {
                    Swal.showValidationMessage("Subforum name is required");
                    return false;
                }
                try {
                    const response = await apiRequest(
                        `forum/categories/${forumId}/subforums/${subforum.id}`,
                        "PUT",
                        token,
                        { name, description }
                    );
                    setCategories(categories.map(category =>
                        category.id === forumId
                            ? {
                                ...category,
                                subforums: category.subforums.map(sub =>
                                    sub.id === subforum.id
                                        ? {
                                            ...response, // Updated name & description
                                            topicCount: sub.topicCount,
                                            postCount: sub.postCount,
                                            lastPost: sub.lastPost
                                        }
                                        : sub
                                ),
                            }
                            : category
                    ));
                    Swal.fire("Success", "Subforum updated!", "success");
                } catch (err) {
                    Swal.fire("Error", "Failed to update subforum", "error");
                }
            }
        });
    };
    const handleEditCategory = (category) => {
        Swal.fire({
            title: "Edit Category",
            input: "text",
            inputValue: category.name,
            inputLabel: "Category Name",
            showCancelButton: true,
            confirmButtonText: "Save",
            preConfirm: async (name) => {
                if (!name) {
                    Swal.showValidationMessage("Category name is required");
                    return false;
                }

                try {
                    const response = await apiRequest(`forum/categories/${category.id}`, "PUT", token, { name });
                    setCategories(categories.map(cat =>
                        cat.id === category.id
                            ? {
                                ...cat,
                                name: response.name,
                            }
                            : cat
                    ));
                    Swal.fire("Success", "Category updated!", "success");
                } catch (err) {
                    Swal.fire("Error", "Failed to update category", "error");
                }
            }
        });
    };
    const handleRemoveCategory = (categoryId) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Deleting this category will remove all its subforums!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "No, cancel!",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiRequest(`forum/categories/${categoryId}`, "DELETE", token);
                    setCategories(categories.filter(category => category.id !== categoryId));
                    Swal.fire("Deleted!", "Category has been removed.", "success");
                } catch (err) {
                    Swal.fire("Error", "Failed to delete category", "error");
                }
            }
        });
    };
    if (loading) return <p className="text-center text-light">Loading forums...</p>;
    return (
        <div className={`container mt-4`}>
            {categories && categories.map(category => (
                <div key={category.id} className={`forum-category mb-4 p-3 rounded shadow ${darkMode ? "bg-dark" : "bg-light"} text-light`}>
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                        <h3 className="category-title text-warning">{category.name}</h3>
                        <div>
                            {user?.roles?.includes("admin") && (
                                <>
                            <button className="btn btn-sm btn-secondary me-2" onClick={() => handleCreateSubforum(category.id)}>
                                <Plus size={16} />
                            </button>
                            <button className="btn btn-sm btn-warning me-2" onClick={() => handleEditCategory(category)}>
                                ✏️
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleRemoveCategory(category.id)}>
                                <Trash2 size={16} />
                            </button>
                            </>
                                )}
                        </div>
                    </div>
                    <table className={`table ${darkMode ? "table-dark" : "table-light"} table-striped table-hover rounded overflow-hidden`}>
                        <thead>
                        <tr>
                            {user?.roles?.includes("admin") && <th className="text-start">Actions</th>}
                            <th className="w-50">Forum</th>
                            <th className="text-center">Topics</th>
                            <th className="text-center">Posts</th>
                            <th className="text-center">Last Post</th>
                        </tr>
                        </thead>
                        <tbody>
                        {category.subforums?.map(subforum => (
                            <tr key={subforum.id} style={{ height: "50px" }}>
                                {/* Only show Actions column if user is admin */}
                                {user?.roles?.includes("admin") && (
                                    <td className="text-start">
                                        <button className="btn btn-sm btn-warning me-2" onClick={() => handleEditSubforum(category.id, subforum)}>
                                            ✏️
                                        </button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleRemoveSubforum(category.id, subforum.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                )}
                                <td>
                                    <Link to={`/forum/${subforum.id}`} className="text-warning font-weight-bold">
                                        {subforum.name}
                                    </Link>
                                    <p className="text-muted small mb-0">{subforum.description}</p>
                                </td>
                                <td className="text-center">{subforum.topicCount}</td>
                                <td className="text-center">{subforum.postCount}</td>
                                <td className="text-center">
                                    {subforum.lastPost ? (
                                        <>
                                            <small>{new Date(subforum.lastPost.createdAt).toLocaleString()}</small><br />
                                            <strong className="text-info">{subforum.lastPost.topicTitle}</strong><br />
                                            <small className="text-muted">By {subforum.lastPost.User.username}</small>
                                        </>
                                    ) : (
                                        <span className="text-muted">No posts yet</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ))}
            {user?.roles?.includes("admin") && (
                <button className="btn btn-success mt-3" onClick={handleCreateCategory}>
                    + Add Category
                </button>
            )}
        </div>
    );
};
export { Forum};