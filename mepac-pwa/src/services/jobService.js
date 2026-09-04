/**
 * Job service — Connected to Convex backend.
 */
import { convexClient, api } from '../convex.js';

/**
 * Fetch the current active job for a user from Convex.
 * @param {string} userId - Worker Convex Document ID
 */
export const getCurrentJob = async (userId) => {
  try {
    if (userId) {
      const activeJob = await convexClient.query(
        api.projects.getActiveJobForWorker,
        { workerId: userId }
      );
      if (activeJob) return activeJob;
    }
  } catch (err) {
    console.warn('Convex getCurrentJob error:', err);
  }

  return null;
};

/**
 * Fetch all projects assigned to a worker.
 * @param {string} userId
 */
export const getAssignedProjectsForUser = async (userId) => {
  try {
    if (userId) {
      const allProjects = await convexClient.query(
        api.projects.getSupervisorProjects,
        { workerId: userId }
      );
      if (allProjects && Array.isArray(allProjects)) {
        return allProjects.filter((p) => p.isAssignedToMe && !p.isCompleted);
      }
    }
  } catch (err) {
    console.warn('Convex getAssignedProjectsForUser error:', err);
  }

  return [];
};

/**
 * Fetch all supervisor projects.
 * @param {string} [workerId]
 */
export const getSupervisorProjects = async (workerId) => {
  try {
    const projects = await convexClient.query(
      api.projects.getSupervisorProjects,
      workerId ? { workerId } : {}
    );
    if (projects && projects.length > 0) return projects;
  } catch (err) {
    console.warn('Convex getSupervisorProjects error:', err);
  }

  return [];
};


