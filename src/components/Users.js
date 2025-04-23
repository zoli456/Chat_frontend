import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Table, Form, Pagination, Spinner, Alert } from "react-bootstrap";

const Users = ({ token, darkMode }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const usersPerPage = 10;

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1); // Reset page when new search triggers
        }, 2000); // 2-second delay

        return () => {
            clearTimeout(handler); // Cleanup timeout on new keystroke
        };
    }, [searchTerm]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await fetch(
                    `${process.env.REACT_APP_BASE_URL}/api/user/list?page=${currentPage}&limit=${usersPerPage}&search=${debouncedSearchTerm}`,
                    {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch users");
                }

                const data = await response.json();
                setUsers(data.users);
                setTotalPages(data.totalPages);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [token, currentPage, debouncedSearchTerm]);

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1); // Reset to first page when searching
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    return (
        <div className={`p-4 ${darkMode ? "bg-dark text-white" : "bg-light text-dark"}`}>
            <h2 className="mb-4">Users</h2>

            <Form onSubmit={handleSearch} className="mb-4">
                <Form.Group controlId="search">
                    <Form.Control
                        type="text"
                        placeholder="Search by username or email"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={darkMode ? "bg-dark text-white" : ""}
                    />
                </Form.Group>
            </Form>

            {loading ? (
                <div className="text-center">
                    <Spinner animation="border" />
                </div>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : (
                <>
                    <Table striped bordered hover variant={darkMode ? "dark" : "light"}>
                        <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Gender</th>
                            <th>Birthdate</th>
                            <th>Created At</th>
                        </tr>
                        </thead>
                        <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>
                                    <Link to={`/profile/${user.id}`} className={darkMode ? "text-white" : ""}>
                                        {user.username}
                                    </Link>
                                </td>
                                <td>{user.email}</td>
                                <td>{user.gender}</td>
                                <td>{new Date(user.birthdate).toLocaleDateString()}</td>
                                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>

                    {totalPages > 1 && (
                        <Pagination className="justify-content-center">
                            <Pagination.First
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                            />
                            <Pagination.Prev
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            />

                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <Pagination.Item
                                        key={pageNum}
                                        active={pageNum === currentPage}
                                        onClick={() => handlePageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </Pagination.Item>
                                );
                            })}

                            <Pagination.Next
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            />
                            <Pagination.Last
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                            />
                        </Pagination>
                    )}
                </>
            )}
        </div>
    );
};

export default Users;