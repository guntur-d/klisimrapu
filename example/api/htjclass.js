
class htj {
    constructor() {

        const ev = new Date()
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };

        this.hartang = ev.toLocaleDateString('id-ID', options)
        this.jam = ev.toLocaleTimeString('id-ID')


    }
}

module.exports = htj