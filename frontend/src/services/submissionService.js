import api from "./api.js";

export const fetchMySubmissions = async () => {
  const response = await api.get("/submissions/my");
  return response.data;
};

export const submitAssignment = async (assignmentId, payload) => {
  const response = await api.post(`/submissions/${assignmentId}`, payload);
  return response.data;
};

export const fetchSubmissionsByAssignment = async (assignmentId) => {
  const response = await api.get(`/submissions/assignment/${assignmentId}`);
  return response.data;
};
