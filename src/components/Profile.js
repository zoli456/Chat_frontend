import React from "react";
import Swal from "sweetalert2";

const Profile = ({ user }) => {
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

                return { oldPassword, newPassword };
            }
        });

        if (formValues) {
            console.log("Old password:", formValues.oldPassword);
            console.log("New password:", formValues.newPassword);
            Swal.fire("Success", "Password changed successfully!", "success");
        }
    };

    return (
        <div className="container mt-5">
            <h1>Profile</h1>
            <p>Name: {user?.username}</p>
            <p>Email: {user?.email}</p>
            <p>Roles: {user?.roles?.join(", ") || "User"}</p>
            <p>Account Created: {new Date(user?.createdAt).toLocaleString()}</p>
            <button className="btn btn-primary" onClick={handleChangePassword}>
                Change Password
            </button>
        </div>
    );
};

export default Profile;