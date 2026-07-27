/**
 * Job service — currently backed by mock data.
 * Replace with Convex mutations/queries when backend is connected.
 */
import { mockJobs } from '../mock/mockData';

/**
 * Fetch the current active job for a user.
 */
export const getCurrentJob = async (userId) => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockJobs.find((job) => job.assignedTo === userId) || mockJobs[0];
};
