window.goatcounter = window.goatcounter || { no_onload: true }

htmx.on('htmx:load', (e) => {
    window.goatcounter.count({
        path: location.pathname + location.search + location.hash,
    })
})

