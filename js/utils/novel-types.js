



























export const NovelFactory = {
    




    create: (data) => ({
        id: data.id || '',
        title: data.title || '',
        author: data.author || 'Unknown',
        cover: data.cover || '',
        status: data.status || 'Ongoing',
        synopsis: data.synopsis || '',
        tags: data.tags || [],
        chapters: data.chapters || [],
        chapter_roots: data.chapter_roots || {}
    }),

    






    createChapter: (id, title, filename) => ({
        id,
        title,
        file: filename
    })
};
