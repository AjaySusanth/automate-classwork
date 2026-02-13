import api from "./api.js";

export const fetchAssignments = async () => {
  const response = await api.get("/assignments");
  return response.data;
};

export const fetchAssignmentById = async (id) => {
  const response = await api.get(`/assignments/${id}`);
  return response.data;
};

export const createAssignment = async (payload) => {
  const response = await api.post("/assignments", payload);
  return response.data;
};

export const updateAssignment = async (id, payload) => {
  const response = await api.put(`/assignments/${id}`, payload);
  return response.data;
};

export const deleteAssignment = async (id) => {
  const response = await api.delete(`/assignments/${id}`);
  return response.data;
};
