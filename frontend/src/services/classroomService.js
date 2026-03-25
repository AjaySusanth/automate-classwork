import api from "./api.js";

export const fetchClassrooms = async () => {
  const response = await api.get("/classrooms");
  return response.data;
};

export const fetchClassroom = async (id) => {
  const response = await api.get(`/classrooms/${id}`);
  return response.data;
};

export const createClassroom = async (name) => {
  const response = await api.post("/classrooms", { name });
  return response.data;
};

export const joinClassroom = async (inviteCode) => {
  const response = await api.post("/classrooms/join", { inviteCode });
  return response.data;
};

export const leaveClassroom = async (id) => {
  const response = await api.post(`/classrooms/${id}/leave`);
  return response.data;
};

export const removeMember = async (classroomId, studentId) => {
  const response = await api.delete(`/classrooms/${classroomId}/members/${studentId}`);
  return response.data;
};

export const deleteClassroom = async (id) => {
  const response = await api.delete(`/classrooms/${id}`);
  return response.data;
};
