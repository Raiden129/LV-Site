




export const adminState = {
    series: [],
    novels: [],
    github: null,
    currentSeries: null,
    currentNovel: null,
    currentChapter: null,
    uploadFiles: [],
    novelUploadFiles: [],
    selectedImages: new Set()
};

export const setSeriesCache = (data) => {
    adminState.series = data;
};

export const setNovelsCache = (data) => {
    adminState.novels = data;
};

export const setCurrentSeries = (name) => {
    adminState.currentSeries = name;
};

export const setCurrentNovel = (id) => {
    adminState.currentNovel = id;
};

export const setCurrentChapter = (num) => {
    adminState.currentChapter = num;
};

export const getGitHubClient = () => adminState.github;

export const setGitHubClient = (client) => {
    adminState.github = client;
};

export const clearGitHubClient = () => {
    adminState.github = null;
};
