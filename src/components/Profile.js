import React, {useEffect} from "react";
import Swal from "sweetalert2";
import {useNavigate} from "react-router-dom";

const Profile = ({ user }) => {
    const navigate = useNavigate();
    useEffect(() => {
        if (!user) {
            navigate("/login");
        }
    },[user])
    const handleChangePassword = async () => {
        const { value: formValues } = await Swal.fire({
            title: "Change Password",
            html:
                '<input id="old-password" type="password" class="swal2-input" placeholder="Old Password">' +
                '<input id="new-password" type="password" class="swal2-input" placeholder="New Password">' +
                '<input id="confirm-password" type="password" class="swal2-input" placeholder="Confirm New Password">',
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                const oldPassword = document.getElementById("old-password").value;
                const newPassword = document.getElementById("new-password").value;
                const confirmPassword = document.getElementById("confirm-password").value;

                if (!oldPassword || !newPassword || !confirmPassword) {
                    Swal.showValidationMessage("All fields are required");
                    return false;
                }

                if (newPassword !== confirmPassword) {
                    Swal.showValidationMessage("New passwords do not match");
                    return false;
                }

                return { oldPassword, newPassword,confirmPassword };
            }
        });

        if (formValues) {
            try {
                const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/user/change-password`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify(formValues)
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire("Success", "Password changed successfully!", "success");
                } else {
                    Swal.fire("Error", data.message || "Password change failed", "error");
                }
            } catch (error) {
                Swal.fire("Error", "Something went wrong", "error");
            }
        }
    };


    return (
        <div className="container mt-5">
            <h1>Profile</h1>
            <p><strong>Name:</strong> {user?.username}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Roles:</strong> {user?.roles?.join(", ") || "User"}</p>
            <p><strong>Gender:</strong> {user?.gender}</p>
            <p><strong>Birthdate:</strong> {new Date(user?.birthdate).toLocaleDateString()}</p>
            <p><strong>Account Created:</strong> {new Date(user?.createdAt).toLocaleString()}</p>
            <button className="btn btn-primary" onClick={handleChangePassword}>
                Change Password
            </button>
        </div>
    );
};

export default Profile;