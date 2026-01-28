
export const adminState = {
    series: [],
    currentSeries: null,
    currentChapter: null,
    uploadFiles: [],
    selectedImages: new Set()
};

export const setSeriesCache = (data) => {
    adminState.series = data;
};

export const setCurrentSeries = (name) => {
    adminState.currentSeries = name;
};

export const setCurrentChapter = (num) => {
    adminState.currentChapter = num;
};
