import React, { useEffect, useState } from "react";
import axios from "axios";
import "../admin.css";

const UserManagement = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await axios.get("/api/teams-with-users");
        setTeams(response.data);
      } catch (err) {
        setError("Failed to fetch teams and users");
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="admin-user-management">
      <h2>User Management (Teams)</h2>
      {teams.length === 0 ? (
        <p>No teams found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Members</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team._id}>
                <td>{team.name}</td>
                <td>
                  <ul>
                    {team.members.map((user) => (
                      <li key={user._id || user.username}>{user.username}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserManagement;
