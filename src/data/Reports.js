import { ref } from 'vue';

const STORAGE_KEY = 'darkalley:reports';

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

export const reports = ref(load());

export const addReport = ({ type, location, description, when }) => {
  const report = {
    id: `R-${Date.now().toString(36).toUpperCase()}`,
    type,
    location,
    description,
    when,
    createdAt: new Date().toISOString(),
    status: 'submitted'
  };

  reports.value = [report, ...reports.value];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports.value));
  } catch {
    /* storage full or blocked: the report still lives in memory for this session */
  }

  return report;
};