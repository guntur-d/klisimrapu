const fpPromise = import('./fingerprint.js')
    .then(FingerprintJS => FingerprintJS.load())

// Get the visitor identifier when you need it.


// const AutoNumeric = require('autonumeric')
class errHandle {
    constructor(code) {
        this.code = code;
        this.success = 0;
        this.name = 'errHandle';
    }
}

class ObjectID {
    constructor() {
        var tss = Math.floor(Date.now() / 1000)
        var genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        this.id = tss.toString(16) + genRanHex(16)
    }
}


var ref = {

    closeDDowns: () => {

        [...ref.getByTag('details')].forEach(el => {
            el.removeAttribute("open");
        })


    },

    makeDatesArr: (startDate, stopDate) => {
        var dateArray = [];
        var currentDate = moment(startDate);
        var stopDate = moment(stopDate);
        while (currentDate <= stopDate) {
            dateArray.push(moment(currentDate).format('YYYY-MM-DD'))
            currentDate = moment(currentDate).add(1, 'days');
        }
        return dateArray;
    },

    intersect: (arr1, arr2) => {
        var newArray = _.intersection(
            arr1, arr2);
        return newArray
    },


    header: (x) => [m('div', { class: 'hero min-h-fit bg-base-100' }, m('div', { class: 'hero-content text-center' }, m('div', { class: 'max-w-lg' }, m({ view: () => x }))))],
    getVar(str) {
        return str.match(/(\b[^\s]+\b)/g);
    },
    lockInput(e, msg) {
        var el = ref.getById(e.target.id)

        if (el) {
            if (el.value.trim() == "") {
                el.classList.remove('input-accent')
                el.classList.add('input-error')
                ref.tell("error", msg, 3000, () => { })
                el.focus()
            } else {
                el.classList.add('input-accent')
                el.classList.remove('input-error')
            }
        }

    },
    getValues() {


        var elBtn = ref.getById("modaliciousTooSimpanBtn")
        if (elBtn) elBtn.innerHTML = '<span class=" icon w-8 "> <i class="fa-solid fa-spinner fa-spin"></i></span>';

        var els = [...ref.getByTag('input')]

        console.log(els)

        var ids = []

        els.forEach(el => {
            if (el.hasAttribute('id')) {
                ids.push(el.id)
            }
        })

        console.log(ids)

        var tempObj = {}
        var tempObj2 = {}

        var zeroVal = []
        ids.forEach(i => {

            var theVal = ref.getById(i).value.trim()

            Object.assign(tempObj, { [i]: theVal })
            Object.assign(tempObj2, { [i]: ref.getById(i).dataset.name })

            if (theVal == '' || theVal == null) {
                zeroVal.push(1)
            }
        })

        var data2send = [tempObj, tempObj2]

        if (zeroVal.length > 0) {
            data2send = null

            ref.tell('warning', 'Ada isian yang masih kosong', 2121, () => { if (elBtn) elBtn.innerHTML = '<span>Simpan</span>' })
        }


        return data2send
    },

    getSelected() {
        var els = [...ref.getByTag('select')]
        var ids = []

        els.forEach(el => {
            if (el.hasAttribute('id')) {
                ids.push(el.id)
            }
        })

        console.log(ids)


        var arrTemp = []

        ids.forEach(i => {

            var el = ref.getById(i)
            var theVal = el.value.trim()
            var text = el.options[el.selectedIndex].text;
            var tempObj = { [i]: theVal, text }
            arrTemp.push(tempObj)

        })

        return arrTemp
    },
    mdlData: null,
    typeRumus: null,
    typeIKK: null,
    admMenu: false,
    kecMenu: false,
    desMenu: false,
    entitasAktif: null,
    logout: () => {
        sessionStorage.removeItem(ref.lsname);
        ref.admMenu = null,
            ref.logged = null
        ref.username = null
        ref.loginBtnDisabled = false
        m.route.set("/");
        m.redraw();



    },
    checkAdm: (cb) => {
        cb == undefined ? cb = () => { } : null
        if (ref.islogged(true)) {
            ref.logged.map(l => {
                (l == "superadmin" || l == "admin") ? (ref.admMenu = true) : false
                // l.length == 8 ? (ref.kecMenu = true, ref.admMenu = false, ref.desMenu = false) : true
                // l.length == 13 ? (ref.kecMenu = false, ref.admMenu = false, ref.desMenu = true) : true
                // console.log(l, ref.admMenu, ref.kecMenu, ref.desMenu)
                // ref.entitasAktif = l

            })
        }
        cb()
    },

    ObjectID: () => {
        return new ObjectID().id
    },


    tunda: (fungsi, msLama) => {
        var myStopFunction = () => {
            clearTimeout(myTimeout);
        }
        var munculkan = () => {
            fungsi()
            myStopFunction()
        }
        var myTimeout = setTimeout(munculkan, msLama);
    },


    withThis: (obj, cb) => cb(obj),
    userId: null,
    username: null,
    fullname: null,
    loginBtnDisabled: false,
    logged: null,
    lsname: "googlechrome",
    getls: (k) => {
        const itemStr = sessionStorage.getItem(k)
        if (!itemStr) {
            return null
        }
        const item = JSON.parse(itemStr)
        const now = new Date()
        // console.log(item.expiry, ref.username)

        var difference = item.expiry - now.getTime();

        var minutesDifference = Math.floor(difference / 1000 / 60);

        //   console.log('difference = ' + minutesDifference + ' minute/s ');

        if (minutesDifference < 15) {
            var newItem = {}

            Object.assign(newItem, { fullname: item.fullname, user: item.user, token: item.token, roles: item.roles, expiry: now.getTime() + 3600000 })

            if (item.opd) {
                Object.assign(newItem, { opd: item.opd })
            }

            sessionStorage.removeItem(k)
            ref.setls(JSON.stringify(newItem))

        }

        if (now.getTime() > item.expiry) {
            sessionStorage.removeItem(k)
            return null
        }
        return item
    },
    setls: (i) => {
        sessionStorage.setItem(ref.lsname, i)
    },

    tell: (type, msg, time, cb) => {

        time == undefined ? time = 5000 : true
        cb == undefined ? cb = () => { } : true

        //just trigger all color

        var allClassAlert = ["alert-success", "alert-warning", "alert-info", "alert-error"]

        var iswe = ['info', 'success', 'warning', 'error', 'query']
        var typeComp;
        var theID = ref.ObjectID();

        iswe.includes(type) ? null : console.log('type not define')
        var num = null
        iswe.forEach((t, idx) => {
            type == t ? num = idx : null
        })

        typeComp = 'alert-' + iswe[num]
        console.log(typeComp)
        // bg - violet - 400
        var comp = [
            m("div", { "class": "toast" },
                m("div", { "class": "alert " + typeComp },
                    m("span", { "class": "loading loading-ring loading-md" }),
                    m("span", { class: "normal-case" },
                        type + ": " + msg
                    ),
                    m("div",
                        [

                            typeComp == "alert-query" ? m("button", {
                                "class": "btn btn-sm btn-primary", onclick: () => {

                                    cb()
                                    remove(theID)
                                }
                            },
                                "Lanjut"
                            ) : null,
                            m("button", { "class": "btn btn-sm btn-secondary btn-outline btn-active ml-1", onclick: () => { remove(theID) } },
                                typeComp == "alert-query" ? "Batal" : "X"
                            ),

                        ]
                    )
                ), // m("progress", { "class": "progress  mt-0", "value": "10", "max": "100" })
            )
        ]

        var remove = (theID) => {
            var theToastEl = ref.getById(theID)
            theToastEl.remove()
        }

        var iDiv = document.createElement('div');

        iDiv.id = theID
        document.getElementsByTagName('body')[0].appendChild(iDiv);
        var theToastEl = ref.getById(theID)
        m.render(theToastEl, m({ view: () => comp }))
        ref.tunda(() => {
            var theToastEl = ref.getById(theID)
            if (theToastEl) remove(theID)
            cb()
        }, time)


    },

    tell2: (type, msg, time, cb) => {

        time == undefined ? time = 3000 : true
        cb == undefined ? cb = () => { } : true
        var title

        type == "success" ? title = "Berhasil" : type == "error" ? title = "Error" :
            type == "warning" ? title = "Perhatian" : type == "question" ? (title = "Konfirmasi") : null

        var QObject = {
            //  position: 'center',
            buttons: [
                ['<button><b>Lanjut</b></button>', (i, t) => {
                    i.hide({ transitionOut: 'fadeOut' }, t, 'button');
                    cb()
                }, true],
                ['<button>Batal</button>', (i, t) => {
                    i.hide({ transitionOut: 'fadeOut' }, t, 'button');
                    return false
                }],
            ],
        }

        var cbObj = {
            onClosed: cb,
        }

        var mainObj = {
            title: title,
            message: msg,
            timeout: time
        }

        type == "question" ? _.assign(mainObj, QObject) : _.assign(mainObj, cbObj)
        iziToast[type](mainObj);

    },

    islogged: (diam) => {

        var item = ref.getls(ref.lsname);
        //  console.log("lsitem, ",item)

        if (item === null) {
            ref.logged = null
            diam == undefined ?
                ref.tell("error", 'waktu login habis, atau anda belum login, mohon login kembali', 1500, () => {
                    ref.userId = null
                    ref.username = null
                    ref.fullname = null
                    ref.loginBtnDisabled = false
                    ref.logged = null
                    m.route.set('/')
                }) : null


        } else {
            var rolesArr = item.roles
            ref.userId = item.id
            ref.username = item.user
            ref.fullname = item.fullname
            ref.loginBtnDisabled = true
            ref.logged = rolesArr

            rolesArr.map(item => {
                Object.assign(ref, { [item]: true })
            })
            return item
        }

    },

    getById: (id) => {
        return document.getElementById(id)
    },
    getByCN: (cn) => {
        return document.getElementsByClassName(cn)
    },
    getByName: (nama) => {
        return document.getElementsByName(nama)
    },


    getByTag: (tag) => {
        return document.getElementsByTagName(tag)
    },
    getqsAll: (tag) => {
        return document.querySelectorAll(tag)
    },





    mdl: { "Joy": "lutju sekali" },
    mdl_id: null,

    makeModal: (name, vFn, big) => {

        big == undefined || big == null || big == false ? big = "" : big = "w-11/12 max-w-5xl"

        return m("dialog", { "class": "modal", id: "modalicious" },
            m("form", { "class": "modal-box " + big, "method": "dialog" },

                [
                    m("button", { "class": "btn btn-sm btn-circle btn-ghost absolute right-2 top-2" },
                        "✕"
                    ),
                    name,


                    m("div", { "class": "modal-action" },
                        m("button", { "class": "btn btn-sm btn-accent", onclick: () => vFn() },
                            "Kirim"
                        ),
                        m("button", { "class": "btn btn-sm  btn-error" },
                            "Batal"
                        )
                    )


                ]
            )
        )
    },

    showModal: () => {

        ref.mdl = ref.getById('modalicious')
        ref.mdl.showModal()

    },

    closeMdl: () => {

        ref.mdl.close()
        ref.mdl = null

    },


    makeModalToo: name => [

        m("dialog", { "class": "modal", id: "modalicious" },
            m("div", { "class": "modal-box w-11/12 max-w-5xl" },
                [
                    m("form", { "method": "dialog" },
                        m("button", { "class": "btn btn-sm btn-circle btn-ghost absolute right-2 top-2" },
                            "✕"
                        )
                    ),
                    name,

                ]
            )
        )
    ],

    makeModal5: name => m('.modal',
        { class: ref.mdl[name] && 'is-active' },
        m('.modal-background'),
        m('.modal-content', m(ref.mdl[name])),
        m('.modal-close.is-large',
            {
                "aria-label": "close",
                onclick: () => [
                    ref.mdl[name] = null,
                    m.redraw()]
            })
    ),
    formdata: null,
    form: (schema, label, id, cb, kelas, xfunc) => {

        xfunc == undefined ? xfunc = () => { } : true

        //     var param = [{id:"username", label:"User Name", type:"text", ph:"nama User", value:null, disabled:false}]

        kelas == undefined ? kelas = "column is-12" : null

        return m('div', { "class": kelas }, m('.box', m("form", { action: "#" },

            schema[0].id ? [

                schema.map(sc => {
                    return m(".field",
                        m("label", { "class": "label" }, sc.label),
                        m(".control",
                            sc.id.substring(0, 6) == "select" ?
                                m("div", { "class": "select" },
                                    m("select", { "id": sc.id },
                                        sc.options.map(i => {
                                            return m("option", { "value": i.value, },
                                                i.desc)
                                        })
                                    )) :
                                m("input", { "id": sc.id, "class": "input", "type": sc.type, "placeholder": sc.ph, "value": sc.value, "disabled": sc.disabled })
                        ))
                })] : m(".field",
                    m("label", { "class": "label" }, label),
                    m(".control",
                        m("div", { "class": "select" },
                            m("select", { "id": id },
                                schema.map(sc => {
                                    return m("option", { "value": sc.kode, },
                                        sc.desc)

                                })
                            )))),
            m("div", { "class": "control" },
                m("button", {
                    "id": "tombolKirim", "class": "button is-link", onclick: (e) => {

                        e = e || window.event
                        e.preventDefault()
                        var IDs = []

                        schema.map(s => {
                            IDs.push(s.id)
                        })


                        var jsondata = {}
                        IDs.map(idInput => {
                            _.assign(jsondata, { [idInput]: ref.getById(idInput).value })
                        })

                        ref.formdata = jsondata

                        cb()
                    }
                },
                    "Kirim"
                ),

                m('button', {
                    class: "button is-danger ml-2", onclick: (e) => {

                        e.preventDefault()


                        xfunc()
                    }
                }, "Batal")

            ))))
    },



    get: (url, cb) => {

        var lstor = ref.islogged()

        if (lstor) {

            m.request({
                method: "GET",
                url: url

            }).then(data => {

                console.log(data)

                if (data) {

                    ref.dataReturn = data
                    cb()

                } else {


                    ref.tell("error", "API down or syntax error", 1200, () => { })

                    ref.dataReturn = data
                    cb()
                }


            }).catch(err => {
                console.log(err)
                ref.dataReturn = err
                cb()
                // ref.tell(err, "error", 999, cb())
            })
        } else {

            var h = window.location.href
            var arr = h.split("/");
            var result = arr[0] + "//" + arr[2]
            ref.tell("error", "sesi login berakhir", 699, () => { location.replace(result) })
        }

    },

    cl: (item) => {
        return console.log(item)
    },
    isLetter: (str) => {

        var regExp = /[a-zA-Z]/g;
        return regExp.test(str)

    },

    fpGen: fpPromise,



    comm: (operation, cb, responseType) => {


        responseType ? responseType : responseType = "json";

        console.log('calling ref comm')

        fpPromise
            .then(fp => fp.get())
            .then(result => {

                const middlefinger = result.visitorId
                console.log(middlefinger)


                var lstor = ref.islogged(true)

                if (lstor) {

                    //  console.log(lstor)

                    m.request({
                        method: "POST",
                        url: "/api/gate",
                        //      headers: { "Authorization": "Guntur " + lstor.token, 'Accept': 'Accept:text/html,application/json,*/*', 'duget': du.get(), 'dupa': JSON.stringify(du.parse()) },
                        headers: { "Authorization": "Guntur" + lstor.token, 'Accept': 'Accept:text/html,application/json,*/*', 'middlefinger2u': middlefinger },
                        body: operation,
                        responseType: responseType
                    }).then(data => {


                        //  console.log(data)

                        if (data) {


                            if (data.status == 403) {
                                sessionStorage.removeItem(ref.lsname)
                                ref.admMenu = null
                                ref.logged = null
                                ref.username = null
                                ref.fullname = null
                                ref.loginBtnDisabled = false
                                ref.tell('error', 'You need to re-login', 877, () => {
                                    m.redraw()
                                    m.route.set('/')
                                })
                            }

                            if (data.success == 0) {
                                console.log("return warning/error")

                                throw new errHandle(data.status);
                            } else {

                                console.log("data ok", operation)

                                ref.dataReturn = data
                                cb()

                            }
                        } else {
                            console.log("data not exist/syntax error")

                            ref.dataReturn = data
                            cb()
                        }


                    }).catch(err => {


                        ref.dataReturn = err
                        cb()

                    })
                } else {

                    var h = window.location.href
                    var arr = h.split("/");
                    var res = arr[0] + "//" + arr[2]
                    console.log(res)
                    ref.tell("error", "sesi login berakhir, mohon login kembali", 1699, () => { location.replace(res) })
                }


            })
            .catch(error => console.error(error))
    },

    comm2: (operation, cb, responseType) => {


        responseType ? responseType : responseType = "json";

        console.log('calling ref comm2')

 

        m.request({
            method: "POST",
            url: "/api/service",
            //      headers: { "Authorization": "Guntur " + lstor.token, 'Accept': 'Accept:text/html,application/json,*/*', 'duget': du.get(), 'dupa': JSON.stringify(du.parse()) },
            headers: { "Authorization": "Guntur's Project", 'Accept': 'Accept:text/html,application/json,*/*' },
            body: operation,
            responseType: responseType
        }).then(data => {


            //  console.log(data)

            if (data) {


         

                if (data.success == 0) {
                    console.log("return warning/error")

                    throw new errHandle(data.status);
                } else {

                    console.log("data ok", operation)

                    ref.dataReturn = data
                    cb()

                }
            } else {
                console.log("data not exist/syntax error")

                ref.dataReturn = data
                cb()
            }


        }).catch(err => {


            ref.dataReturn = err
            cb()

        })




            .catch(error => console.error(error))
    },

    //     responseType ? responseType : responseType = "json";

    //     var tableName
    //     var ops

    //     var arepArr = ["golek", "ngisi", "owah", "busak"]
    //     var arepObj = { "golek": null, "ngisi": "simpan", "owah": "update", "busak": "hapus" }
    //     if (arepArr.includes(operation.arep)) {
    //         tableName = operation.nang
    //     } else tableName = null

    //     arepArr.map(a => { a == operation.arep ? ops = arepObj[a] : null })

    //     m.request({
    //         method: "POST",
    //         url: "./api/news",
    //         headers: { "Authorization": "Bearer " + "Hamung SHAK", 'Accept': 'Accept:text/html,application/json,*/*' },
    //         body: operation,
    //         responseType: responseType
    //     }).then(data => {

    //         console.log(operation)
    //         console.log(data)

    //         if (data) {

    //             if (data.success == 0) {
    //                 console.log("return warning/error")

    //                 throw new errHandle(data.status);
    //             } else {

    //                 console.log("data ok", ops)
    //                 if (tableName && ops) {
    //                     //  ref.tell("success", ops +  " berhasil", 1200, () => {
    //                     ref.dataReturn = data
    //                     cb()
    //                     // })
    //                 } else {
    //                     ref.dataReturn = data
    //                     cb()

    //                 }

    //             }
    //         } else {
    //             console.log("data not exist/syntax error")
    //             if (tableName && ops) {
    //                 ref.tell("error", ops + " data pada table " + tableName + " gagal", 1200, () => { })
    //             }
    //             ref.dataReturn = data
    //             cb()
    //         }


    //     }).catch(err => {


    //         ref.dataReturn = err
    //         cb()

    //     })

    // },

    // comm3: (operation, cb, responseType) => {

    //     responseType ? responseType : responseType = "json";

    //     var tableName
    //     var ops

    //     var arepArr = ["golek", "ngisi", "owah", "busak"]
    //     var arepObj = { "golek": null, "ngisi": "simpan", "owah": "update", "busak": "hapus" }
    //     if (arepArr.includes(operation.arep)) {
    //         tableName = operation.nang
    //     } else tableName = null

    //     arepArr.map(a => { a == operation.arep ? ops = arepObj[a] : null })

    //     m.request({
    //         method: "POST",
    //         url: "./api/start",
    //         headers: { "Authorization": "Bearer " + "HSHAK", 'Accept': 'Accept:text/html,application/json,*/*' },
    //         body: operation,
    //         responseType: responseType
    //     }).then(data => {

    //         console.log(operation)
    //         console.log(data)

    //         if (data) {

    //             if (data.success == 0) {
    //                 console.log("return warning/error")

    //                 throw new errHandle(data.status);
    //             } else {

    //                 console.log("data ok", ops)
    //                 if (tableName && ops) {
    //                     //  ref.tell("success", ops +  " berhasil", 1200, () => {
    //                     ref.dataReturn = data
    //                     cb()
    //                     // })
    //                 } else {
    //                     ref.dataReturn = data
    //                     cb()

    //                 }

    //             }
    //         } else {
    //             console.log("data not exist/syntax error")
    //             if (tableName && ops) {
    //                 ref.tell("error", ops + " data pada table " + tableName + " gagal", 1200, () => { })
    //             }
    //             ref.dataReturn = data
    //             cb()
    //         }


    //     }).catch(err => {


    //         ref.dataReturn = err
    //         cb()

    //     })

    // },


    // comm4: (operation, cb, responseType) => {

    //     responseType ? responseType : responseType = "json";
    //     var tableName
    //     var ops

    //     var arepArr = ["golek", "ngisi", "owah", "busak"]
    //     var arepObj = { "golek": null, "ngisi": "simpan", "owah": "update", "busak": "hapus" }
    //     if (arepArr.includes(operation.arep)) {
    //         tableName = operation.nang
    //     } else tableName = null

    //     arepArr.map(a => { a == operation.arep ? ops = arepObj[a] : null })

    //     m.request({
    //         method: "POST",
    //         url: "./api/daftar",
    //         headers: { 'Accept': 'Accept:text/html,application/json,*/*' },
    //         body: operation,
    //         responseType: responseType
    //     }).then(data => {

    //         console.log(operation)
    //         console.log(data)

    //         if (data) {

    //             if (data.success == 0) {
    //                 console.log("return warning/error")

    //                 throw new errHandle(data.status);
    //             } else {


    //                 ref.dataReturn = data
    //                 cb()



    //             }
    //         } else {
    //             console.log("data not exist/syntax error")
    //             if (tableName && ops) {
    //                 ref.tell("error", ops + " data pada table " + tableName + " gagal", 1200, () => { })
    //             }
    //             ref.dataReturn = data
    //             cb()
    //         }


    //     }).catch(err => {


    //         ref.dataReturn = err
    //         cb()

    //     })

    // },

    // comm5: (operation, cb, responseType) => {

    //     responseType ? responseType : responseType = "json";


    //     var tableName
    //     var ops

    //     var arepArr = ["golek", "ngisi", "owah", "busak"]
    //     var arepObj = { "golek": null, "ngisi": "simpan", "owah": "update", "busak": "hapus" }
    //     if (arepArr.includes(operation.arep)) {
    //         tableName = operation.nang
    //     } else tableName = null

    //     arepArr.map(a => { a == operation.arep ? ops = arepObj[a] : null })


    //     m.request({
    //         method: "POST",
    //         url: "./api/start",
    //         headers: { 'Accept': 'Accept:text/html,application/json,*/*' },
    //         body: operation,
    //         responseType: responseType
    //     }).then(data => {

    //         console.log(operation)
    //         console.log(data)

    //         if (data) {

    //             if (data.success == 0) {
    //                 console.log("return warning/error")

    //                 throw new errHandle(data.status);
    //             } else {

    //                 console.log("data ok", ops)
    //                 if (tableName && ops) {
    //                     //  ref.tell("success", ops +  " berhasil", 1200, () => {
    //                     ref.dataReturn = data
    //                     cb()
    //                     // })
    //                 } else {
    //                     ref.dataReturn = data
    //                     cb()

    //                 }

    //             }
    //         } else {
    //             console.log("data not exist/syntax error")
    //             if (tableName && ops) {
    //                 ref.tell("error", ops + " data pada table " + tableName + " gagal", 1200, () => { })
    //             }
    //             ref.dataReturn = data
    //             cb()
    //         }


    //     }).catch(err => {


    //         ref.dataReturn = err
    //         cb()

    //     })

    // },
    dataReturn: null,

    titleCase: (str) => {
        return str.toLowerCase().replace(/(^|\s)\S/g, L => L.toUpperCase());
    },


    getSecondPart: (str, sign) => {
        return str.split(sign).slice(1).join(" ");
    },

    getFirstPart: (str, sign) => {
        return str.split(sign)[0];
    },

    customSort: (d, key, order) => {
        var sort = {
            asc: function (a, b) {
                var l = 0, m = Math.min(a.value.length, b.value.length);
                while (l < m && a.value[l] === b.value[l]) {
                    l++;
                }
                return l === m ? a.value.length - b.value.length : a.value[l] - b.value[l];
            },
            desc: function (a, b) {
                return sort.asc(b, a);
            }
        },

            // temporary array holds objects with position and sort-value
            mapped = d.map(function (el, i) {
                return { index: i, value: el[key].split('.').map(Number) };
            });

        // sorting the mapped array containing the reduced values
        mapped.sort(sort[order] || sort.asc);

        // container for the resulting order
        return mapped.map(function (el) {
            return d[el.index];
        });
    },

    // autoNumEls: [],

    // autoNumOpsiRp: {
    //     digitGroupSeparator: '.',
    //     decimalCharacter: ',',
    //     currencySymbol: 'Rp',
    //     currencySymbolPlacement: AutoNumeric.options.currencySymbolPlacement.prefix,
    //     roundingMethod: AutoNumeric.options.roundingMethod.halfUpSymmetric,
    // },

    // autoNum: (id) => {

    //     var el = ref.getById(id)

    //     if (AutoNumeric.getAutoNumericElement(el) === null) {
    //         var oid = new AutoNumeric(el, ref.autoNumOpsiRp);
    //         ref.autoNumEls.push(oid)
    //     }

    // },

    // autoNumRemove: () => {
    //     ref.autoNumEls.forEach(el => {
    //         el.remove()
    //     })
    //     ref.autoNumEls = []
    // },

    checkInputs: (arrInputs) => {

        var empty = []
        arrInputs.forEach((i, idx) => {
            typeof (i) == 'string' ? null : i = i.toString()
            _.isEmpty(i) ? empty.push(idx) : null

        })
        return empty

    },
    chunkArray: (arr, size) =>
        arr.length > size
            ? [arr.slice(0, size), ...ref.chunkArray(arr.slice(size), size)]
            : [arr],



    showModalicious: (title, x, svbtn) => {

        var g = m({
            view: () => m("div", { "class": "modal is-active", id: "modalicious" },
                m("div", { "class": "modal-background" }),
                m("div", { "class": "modal-card" },
                    m("header", { "class": "modal-card-head" },
                        m("p", { "class": "modal-card-title" },
                            title),
                        m("button", { "class": "delete", "aria-label": "close", onclick: () => ref.removeMdl() })),
                    m("section", { "class": "modal-card-body" }, m({ view: () => x })),
                    m("footer", { "class": "modal-card-foot" },
                        m({ view: () => svbtn }),
                        m("button", { "class": "button is-danger is-outlined", onclick: () => ref.removeMdl() },
                            "Batal"
                        )
                    )
                )
            )
        })

        m.redraw()
        return g
    },

    // showModal: (x) => {

    //     var g = m({
    //         view: () => m('.modal.is-active', m('.modal-background'), m('.modal-content', m({ view: () => x })), m('.modal-close.is-large', {
    //             "aria-label": "close", onclick: () => ref.removeMdl()
    //         }))
    //     })

    //     m.redraw()
    //     return g
    // },

    showModalToo: (title, x, svbtn) => {

        var g = m({
            view: () => m("div", { "class": "modal is-active" },
                m("div", { "class": "modal-background" }),
                m("div", { "class": "modal-card" },
                    m("header", { "class": "modal-card-head" },
                        m("p", { "class": "modal-card-title" },
                            title),
                        m("button", { "class": "delete", "aria-label": "close", onclick: () => ref.removeMdl() })),
                    m("section", { "class": "modal-card-body" }, m({ view: () => x })),
                    m("footer", { "class": "modal-card-foot" },
                        m({ view: () => svbtn }),
                        m("button", { "class": "button is-danger is-outlined", onclick: () => ref.removeMdl() },
                            "Batal"
                        )
                    )
                )
            )
        })

        m.redraw()
        return g
    },


    removeMdl: () => {
        ref.getByCN("modal")[0].classList.remove('is-active')

    },


    numFmt: (classNames, dec) => {

        dec == undefined ? dec = 6 : null

        classNames == undefined ? classNames = null : null


        var el;
        classNames ? el = [...ref.getByCN(classNames)] : null

        if (el && el.length > 0) {



            if (ref.autoNumArr) {
                ref.autoNumArr.forEach(autoEl => autoEl.remove())
            }

            el.forEach(e => {

                var anyar = new AutoNumeric(e, {

                    decimalCharacter: ',',
                    digitGroupSeparator: '.',
                    unformatOnSubmit: true,
                    decimalPlaces: dec,
                    watchExternalChanges: true
                })


                ref.autoNumArr.push(anyar)

                //   console.log("init ", classNames)

            })

        }
    },
    retNum: (el) => {
        var elem = ref.getById(el)
        return AutoNumeric.getNumericString(elem)
    },

    autoNumArr: [],

    polos: (str) => {

        //  console.log(str)

        const dotsRemoved = str.replaceAll('.', '')
        const commaRemoved = dotsRemoved.replace(",", ".");
        // console.log(commaRemoved)
        return commaRemoved;

    },

    cari: (id, idTab, col) => {
        var input = ref.getById(id);
        var filters = input.value.toUpperCase().split(' '); // create several filters separated by space
        var table = ref.getById(idTab);
        var tr = table.getElementsByTagName("tr");

        for (let i = 0; i < tr.length; i++) {
            const td = tr[i].getElementsByTagName("td")[col];

            if (td) {
                const txtValue = td.textContent || td.innerText;
                tr[i].style.display = "none"; // hide each row

                for (var filter of filters) { // add the rows matching a filter
                    if (txtValue.toUpperCase().indexOf(filter) > -1) {
                        tr[i].style.display = "";
                    }
                }
            }
        }
    },

    workingDaysBetweenDates: (d0, d1, holidays) => {

        function parseDate(input) {
            // Transform date from text to date
            var parts = input.match(/(\d+)/g);
            // new Date(year, month [, date [, hours[, minutes[, seconds[, ms]]]]])
            return new Date(parts[0], parts[1] - 1, parts[2]); // months are 0-based
        }
        /* Two working days and an sunday (not working day) */
        //   var holidays = ['2016-05-03', '2016-05-05', '2016-05-07'];
        var startDate = parseDate(d0);
        var endDate = parseDate(d1);

        // Validate input
        if (endDate <= startDate) {
            return 0;
        }

        // Calculate days between dates
        var millisecondsPerDay = 86400 * 1000; // Day in milliseconds
        startDate.setHours(0, 0, 0, 1);  // Start just after midnight
        endDate.setHours(23, 59, 59, 999);  // End just before midnight
        var diff = endDate - startDate;  // Milliseconds between datetime objects    
        var days = Math.ceil(diff / millisecondsPerDay);

        // Subtract two weekend days for every week in between
        var weeks = Math.floor(days / 7);
        days -= weeks * 2;

        // Handle special cases
        var startDay = startDate.getDay();
        var endDay = endDate.getDay();

        // Remove weekend not previously removed.   
        if (startDay - endDay > 1) {
            days -= 2;
        }
        // Remove start day if span starts on Sunday but ends before Saturday
        if (startDay == 0 && endDay != 6) {
            days--;
        }
        // Remove end day if span ends on Saturday but starts after Sunday
        if (endDay == 6 && startDay != 0) {
            days--;
        }
        /* Here is the code */
        holidays.forEach(day => {
            if ((day >= d0) && (day <= d1)) {
                /* If it is not saturday (6) or sunday (0), substract it */
                if ((parseDate(day).getDay() % 6) != 0) {
                    days--;
                }
            }
        });
        return days;
    },

    indoDateFmt: (date) => {
        return new Date(date).toLocaleString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    },

    diffdays: (startDate, endDate) => {
        const diffInMs = new Date(endDate) - new Date(startDate)
        return diffInMs / (1000 * 60 * 60 * 24);
    },




    fmtRp: (num) => { return num.toLocaleString('id', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    urutFn: (fn1, fn2) => {
        fn2(fn1)
    },


    gTab: (id, tab, kelas) => {

        kelas == undefined ? kelas = "table" : null

        var table = []

        var bodyPart = []
        var titlePart = []

        var footerPart = []
        console.log(tab)

        /*
      {c:any, d:any, r:any}
   */


        for (var key in tab) {
            tab[key].map((arr, idx) => {

                var trObj = {}
                var objComp = []

                arr.map(obj => {

                    var tdComp = {}
                    var ctn, tdComp

                    _.forIn(obj, (value, key) => {

                        if (key == 'r') { _.assign(trObj, value) }
                        else if (key == 'd') { tdComp = value }
                        else if (key == 'c') { ctn = value }

                    })

                    objComp.push(m('td', tdComp, ctn))

                })

                var arrTemp = []

                if (key == 'body') {
                    _.assign(trObj, {
                        onclick: (e) => {

                            ref.getById(id).querySelectorAll('tr').forEach(el => {
                                el.classList.remove("bg-accent")
                                el.classList.remove("rowSel")
                                el.classList.remove("text-white")
                            })
                            // var selEl = ref.getById('theRow' + idx)
                            // selEl.classList.add('is-selected')

                            e = e || window.event;
                            var target = e.target;


                            while (target && target.nodeName !== "TR") {
                                target = target.parentNode;
                            }

                            if (target) {
                                target.classList.add('bg-accent')
                                target.classList.add('rowSel')
                                target.classList.add('text-white')
                            }


                        }
                    })
                }

                arrTemp.push(m('tr', trObj, objComp))
                key == 'title' ? titlePart.push(arrTemp) : key == 'body' ? bodyPart.push(arrTemp) : footerPart.push(arrTemp)


            })
        }


        table.push(m("table", { class: kelas, id: id },
            m("thead", { class: "" }, titlePart),
            m("tbody", { class: "" }, bodyPart),
            m("tfoot", { class: "" }, footerPart),
        ))

        return table

    },

    /*
      gForm params = (
      
          title,
          sub-title,
          bodyArr [{
                      type: text | textarea | file | select | checkbox | radio 
          cbr: [ {                   
                  label: //also as id and name
                  lblHelper: 
                  checked            } ]
          id:
          selectOpt: [{kode:any, nama:any}]
          dataMsg:
          label: 
          required :
          col : length (1-6)
          colstart : 
          value :         }]
      } 
      */
    gForm: (title, subtitle, bodyArr, xFn, vFn, del) => {

        // xFn == undefined ? xFn = false : true
        // vFn == undefined ? vFn = false : true

        var lines = []

        var lead = (content) => {
            return [m("form",
                m("div", { "class": "space-y-6" },
                    m("div", { "class": "border-b border-gray-900/10 pb-12" },
                        [
                            m("h2", { "class": "text-base font-semibold leading-7 text-gray-900" },
                                title
                            ),
                            m("p", { "class": "mt-1 text-sm leading-6 text-gray-600" },
                                subtitle
                            ),
                            m("div", { "class": "mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6" }, content), //grid-cols-1

                        ]
                    )
                ),
                vFn || xFn ? m("div", { "class": "mt-6 flex items-center justify-end gap-x-6" },
                    [
                        xFn ? m("button", {
                            "class": "btn", "type": "button", onclick: () => {
                                xFn()
                            }
                        },
                            "Batal"
                        ) : null, vFn ?
                            m("button", {
                                id: "modaliciousTooSimpanBtn", "class": del ? "btn btn-error" : "btn btn-accent", "type": "button",

                                onclick: () => {

                                    vFn()
                                }
                            },
                                del ? "Hapus" : "Simpan"
                            ) : null
                    ]
                ) : null
            )
            ]
        }

        var lineStart = (col, colStart, label, inputComp, id) => {
            var lengthClass
            var colSt = colStart ? " sm:col-start-" + colStart : null

            col < 6 ? lengthClass = 'sm:col-span-' + col + colSt : lengthClass = 'col-span-full' + colSt

            return [m("div", { "class": lengthClass },

                m("label", { "class": "block text-sm font-medium leading-6 text-gray-900 mt-2", "for": id },
                    label
                ), inputComp

            )]
        }

        var cbrHeader = (label, cbrLines) => {

            return m("fieldset",

                m("legend", { "class": "text-sm font-semibold leading-6 text-gray-900 mt-2" },
                    label
                ),
                m("div", { "class": "mt-6 space-y-6" },

                    m("div", { "class": "relative flex gap-x-3" }, cbrLines)))

        }



        var compClass = "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6  "

        bodyArr.forEach(b => {


            if ((["text", "email", "textarea", "file", "tel", "number", "date"].includes(b.type))) {

                b.autoNum ? compClass += "autoNum " : null

                b.type == "file" ? compClass = "file-input file-input-bordered w-full max-w-xs" : null

                var inputComp = m("input", {
                    "class": compClass + " input mt-2", "id": b.id, "name": b.id, "type": b.type, required: b.required, "data-msg": b.dataMsg, "placeholder": b.dataMsg, onblur: b.required ? (e) => {

                        ref.lockInput(e, b.dataMsg + " harus diisi!")

                    } : null, value: b.value, readonly: del ? "readonly" : false
                })

                lines.push(lineStart(b.col, b.colStart, b.label, inputComp, b.id))


            } else if (b.type == "cbr") {
                compClass = "h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"

                var cbrLines = []

                b.forEach(cbr => {
                    cbr.type == "radio" ? compClass += "radio" : compClass += "checkbox"
                    cbr.checked == undefined ? cbr.checked == false : null

                    cbrLines.push(
                        m("div", { "class": "flex h-6 items-center" },
                            m("input", { "class": compClass, "id": cbr.label, "name": cbr.label, "data-msg": cbr.lblHelper, "type": cbr.type, "checked": b.value == cbr.label ? true : cbr.checked })
                        ),
                        m("div", { "class": "text-sm leading-6" },
                            [
                                m("label", { "class": "font-medium text-gray-900 mt-2", "for": cbr.label },
                                    cbr.label
                                ),
                                m("p", { "class": "text-gray-500" },
                                    cbr.lblHelper
                                )
                            ]
                        )
                    )
                })

                lines.push(cbrHeader(cbrLines))

            } else if (b.type == "select") {


                var optionFill = () => {
                    var opts = []
                    b.selectOpt.forEach(opt => {
                        opts.push(
                            m("option", { selected: b.value == opt.kode ? "selected" : false, value: opt.kode },
                                opt.nama
                            ),
                        )
                    })
                    return opts
                }

                var inputComp = m("div", { "class": "mt-2" },
                    m("select", { "class": compClass + " select select-bordered", "id": b.id, "name": b.id, "data-msg": b.label, disabled: del ? "disabled" : false },
                        optionFill()
                    )
                )

                lines.push(lineStart(b.col, b.colStart, b.label, inputComp, b.id))

            }

        })



        return lead(lines)

    }

}


export default ref
