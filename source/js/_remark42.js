const remark_config = {
    host: 'https://comments.lorefnon.com',
    site_id: 'lorefnon-blog',
    components: ['embed', 'last-comments']
}

window.remark_config = remark_config;

!function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark_config.host+"/web/"+e[o]+c,d.appendChild(r)}}(remark_config.components||["embed"],document);

var remark42Instance;

htmx.on('htmx:load', () => {
    if (!window.REMARK42) return;
    if (remark42Instance) {
      remark42Instance.destroy()
    }
    remark42Instance = REMARK42.createInstance(remark_config)
})
