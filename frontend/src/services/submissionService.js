import api from "./api.js";

export const fetchMySubmissions = async () => {
  const response = await api.get("/submissions/my");
  return response.data;
};

export const fetchMySubmission = async (assignmentId) => {
  const response = await api.get(`/submissions/my/${assignmentId}`);
  return response.data;
};

export const submitAssignment = async (assignmentId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`/submissions/${assignmentId}`, formData);
  return response.data;
};

export const fetchSubmissionsByAssignment = async (assignmentId) => {
  const response = await api.get(`/submissions/assignment/${assignmentId}`);
  return response.data;
};
