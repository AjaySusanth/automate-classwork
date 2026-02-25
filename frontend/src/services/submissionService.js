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

export const downloadSubmissionsZip = async (assignmentId) => {
  const response = await api.get(`/submissions/assignment/${assignmentId}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?(.+?)"?$/);
  link.download = match ? match[1] : "submissions.zip";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const gradeSubmission = async (submissionId, grade) => {
  const response = await api.patch(`/submissions/${submissionId}/grade`, { grade });
  return response.data;
};
