hexo.extend.helper.register("formatDate", (timestamp) => {
    return new Date(timestamp).toISOString().split('T')[0]
})
