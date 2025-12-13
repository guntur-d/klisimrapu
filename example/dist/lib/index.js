import r from './ref.js'
import Typed from '../js/typed.umd.js'



// import footer from './footer.js'

// import vform from './vform.js'
import stars from './stars.js'

// document.body.innerHTML = "";


// import pg from "./playground.js"


// import test from './test.js'

console.log('loaded index')



var g = {

    wilayah: null,

    phase: null,

    labelsgo: () => {
        const labels = document.querySelectorAll(".form-control label");

        labels.forEach((label) => {
            label.innerHTML = label.innerText
                .split("")
                .map(
                    (letter, idx) =>
                        `<span style="transition-delay:${idx * 50}ms">${letter}</span>`
                )
                .join("");
        });
    },
    stars: (imel) => {

        var globalStyle = `
    <style> 
    
    .container {
        background-color: transparent;
        padding: 20px 40px;
        border-radius: 5px;
        border-style: solid;
        border-color: green;
        overflow: hidden;
      
    
        align-items: center;
        justify-content: center;
      }
      
      .container h1 {
        text-align: center;
        margin-bottom: 30px;
        color: white;
      }
      
      .container a {
        text-decoration: none;
        color: lightblue;
      }
      
      .btn {
        cursor: pointer;
        display: inline-block;
        width: 100%;
        background: lightblue;
        padding: 15px;
        font-family: inherit;
        font-size: 16px;
        border: 0;
        border-radius: 5px;
      }
      
      .btn:focus {
        outline: 0;
      }
      
      .btn:active {
        transform: scale(0.98);
      }

      .btn:disabled {
        cursor: not-allowed;
      }

      .btn:disabled:active {
        transform: none;
      }
      
      text {
        margin-top: 30px;
      }
      
      .form-control {
        position: relative;
        margin: 8px 0 15px;
        width: 300px;
      }
      
      .form-control input {
        background-color: transparent;
        border: 0;
        border-bottom: 2px #fff solid;
        display: block;
        width: 100%;
        padding: 15px 0;
        font-size: 18px;
        color: #fff;
      }
      
      .form-control input:focus,
      .form-control input:valid {
        outline: 0;
        border-bottom-color: lightblue;
      }
      
      .form-control label {
        color: white;
        position: absolute;
        top: 15px;
        left: 0;
        pointer-events: none;
      }
      
      .form-control label span {
        color: white;
        display: inline-block;
        font-size: 18px;
        min-width: 5px;
        transition: 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      
      .form-control input:focus + label span,
      .form-control input:valid + label span {
        color: lightblue;
        transform: translateY(-30px);
      }
      
      .form-control select {
      
        background-color: transparent;
        border: 0;
        border-bottom: 2px #fff solid;
        
        width: 100%;
        
        font-size: 18px;
        color : white;
        height: 30px;
 
        
      }

        select option:active {
       
        color:white;
        background-color: transparent;
      }
       

   
 
       
      
    </style>
        
        `


        window.requestAnimationFrame = (function () { return window.requestAnimationFrame })();
        var canvas = document.getElementById("space");
        var c = canvas.getContext("2d");



        var numStars = 1900;
        var radius = '0.' + Math.floor(Math.random() * 9) + 1;
        var focalLength = canvas.width * 2;
        var warp = 0;
        var centerX, centerY;

        var stars = [], star;
        var i;

        var animate = true;

        initializeStars();

        function executeFrame() {

            if (animate)
                requestAnimationFrame(executeFrame);
            moveStars();
            drawStars();
        }

        function initializeStars() {
            centerX = canvas.width / 2;
            centerY = canvas.height / 2;

            stars = [];
            for (i = 0; i < numStars; i++) {
                star = {
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    z: Math.random() * canvas.width,
                    o: '0.' + Math.floor(Math.random() * 99) + 1
                };
                stars.push(star);
            }
        }

        function moveStars() {
            for (i = 0; i < numStars; i++) {
                star = stars[i];
                star.z--;

                if (star.z <= 0) {
                    star.z = canvas.width;
                }
            }
        }

        function drawStars() {
            var pixelX, pixelY, pixelRadius;

            // Resize to the screen
            if (canvas.width != window.innerWidth || canvas.width != window.innerWidth) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                initializeStars();
            }
            if (warp == 0) {
                c.fillStyle = "rgba(0,10,20,1)";
                c.fillRect(0, 0, canvas.width, canvas.height);
            }
            c.fillStyle = "rgba(209, 255, 255, " + radius + ")";
            for (i = 0; i < numStars; i++) {
                star = stars[i];

                pixelX = (star.x - centerX) * (focalLength / star.z);
                pixelX += centerX;
                pixelY = (star.y - centerY) * (focalLength / star.z);
                pixelY += centerY;
                pixelRadius = 1 * (focalLength / star.z);

                c.fillRect(pixelX, pixelY, pixelRadius, pixelRadius);
                c.fillStyle = "rgba(209, 255, 255, " + star.o + ")";
                //c.fill();
            }
        }

        var warpNOW = () => {


            warp = warp == 1 ? 0 : 1;

            c.clearRect(0, 0, canvas.width, canvas.height);
            c.fillStyle = "black";
            c.fillRect(0, 0, canvas.width, canvas.height);

            executeFrame();
        };

        executeFrame();

        var el = document.createElement("div");
        el.setAttribute("style", "position:relative; width:400px; top:10%;left:50%;transform: translateX(-50%);background-color:transparent;z-index:25;overflow:hidden;");
        //  el.setAttribute("style", "position:fixed;background-color:white;z-index:25;");

        el.setAttribute("id", "box1");
        el.innerHTML = `
        
            <div class="container">
      <h1 id="welcome"></h1>
      <form>
      <div class="form-control" autocomplete="off">
        <input id="imel" type="search" required autocomplete="false" name="hidden"> 
        <label> Email </label>
        
      </div>

      
  
      <button class="btn" id="kirim" disabled>selanjutnya.. </button>
      
      </form>
    </div>
` + globalStyle




        //     <div class="form-control">
        //     <input type="search" required autocomplete="false" name="hidden">
        //     <label> Password </label>
        //   </div>

        var kirimEl
        var layerEl = document.getElementById('layer2')

        var showBox = (el) => {
            layerEl.appendChild(el);
            kirimEl = r.getById('kirim')
            kirimEl.disabled = true


            kirimEl.addEventListener('click', (e) => {

                var errTell = (msg) => {
                    iziToast.show({
                        title: 'Error',
                        message: msg,
                        color: 'red'
                    })
                }

                e.preventDefault()
                r.phaseEmail = r.getById('imel').value

                var paramGet = {
                    method: 'get',
                    tableName: 'submitModel',
                    json: { email: r.phaseEmail }

                }

                r.comm2(paramGet, () => {
                    if (r.dataReturn.success == 1) {
                        errTell('email sudah terdaftar dalam database efin.site')
                    } else {



                        var box2 = `

                                            <div class="container">
                                            <h1>Form Pendaftaran</h1>
                                            <form>
                                        
                                                <div class="form-control" autocomplete="off">

                                                    <select id="prop">
                                                        <option value="0" selected style="background-color: grey;">pilih Provinsi</option>
                                                    </select>
                                                
                                                    
                                                </div>

                                                <div class="form-control" autocomplete="off">

                                                <select id="wilayah" disabled>
                                                    <option value="0" selected style="background-color: grey;">pilih Pemda</option>
                                                </select>
                                            
                                                
                                            </div>
                                                <div class="form-control" autocomplete="off">
                                                <input id="instansi" type="search" required autocomplete="false" name="hidden">
                                                <label> Instansi </label>
                                            </div>
                                                <div class="form-control" autocomplete="off">
                                        
                                                    <input id="nama" type="search" required autocomplete="false" name="hidden">
                                                    <label> Nama Lengkap </label>
                                                </div>
                                                <div class="form-control" autocomplete="off">
                                                    <input id="jabatan" type="search" required autocomplete="false" name="hidden">
                                                    <label> Jabatan </label>
                                                </div>
                                                <div class="form-control" autocomplete="off">
                                                    <input id="no_hp" type="search" required autocomplete="false" name="hidden">
                                                    <label> No HP </label>
                                                </div>
                                                <div class="form-control" autocomplete="off">
                                                    <input id="no_ktr" type="search" required autocomplete="false" name="hidden">
                                                    <label> No Telp Kantor </label>
                                                </div>
                                            
                                        
                                
                                        
                                                <button class="btn" id="submitBtn">Kirim</button>
                                        
                                            </form>
                                        </div>
                            `  + globalStyle;

                        el.innerHTML = box2
                        var selectEl = r.getById('prop')
                        
                        console.log('=== POPULATING PROVINCES ===');
                        console.log('g.wilayah available:', g.wilayah);
                        console.log('g.wilayah length:', g.wilayah ? g.wilayah.length : 'undefined');

                        g.wilayah.forEach(wil => {

                            if (wil.kode.length == 2) {
                                var opt = document.createElement('option');
                                opt.value = wil.kode
                                opt.innerHTML = wil.nama;
                                opt.style.backgroundColor = "grey";
                                selectEl.appendChild(opt);
                                selectEl.style.color = 'white'
                            }


                        })

                        console.log('Province options added. Total options:', selectEl.options.length);
                        
                        // Add event listener with debug logging
                        console.log('=== ATTACHING EVENT LISTENER ===');
                        console.log('selectEl:', selectEl);
                        console.log('selectEl id:', selectEl.id);
                        
                        selectEl.addEventListener('change', () => {

                            var kode = selectEl.value
                            var wilayahEl = r.getById('wilayah')
                            wilayahEl.disabled = false
                            
                            // Clear existing options except the first one
                            wilayahEl.innerHTML = '<option value="0" selected style="background-color: grey;">pilih Pemda</option>'

                            console.log('Fetching regencies for province:', kode)

                            // Don't fetch if province not selected
                            if (kode === "0") {
                                return;
                            }

                            // Fetch regencies from Indoarea API for the selected province
                            fetch(`https://indoarea.vercel.app/api/kabupaten-kota?provinsi_code=${kode}`, {
                                method: "GET",
                                headers: {
                                    "Accept": "application/json"
                                }
                            }).then(function (response) {
                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                return response.json();
                            }).then(function (data) {
                                console.log('Regencies API response:', data);
                                
                                // Check if data exists and has content
                                if (data.success && data.data && data.data.length > 0) {
                                    console.log(`Found ${data.data.length} regencies for province ${kode}`);
                                    
                                    // Transform and populate regencies
                                    data.data.forEach(function(regency) {
                                        var opt = document.createElement('option');
                                        opt.value = regency.code;
                                        opt.innerHTML = regency.name;
                                        opt.style.backgroundColor = "grey";
                                        wilayahEl.appendChild(opt);
                                    });
                                    wilayahEl.style.color = 'white';
                                    console.log('Regencies populated successfully');
                                } else {
                                    console.warn('No regencies found for province:', kode);
                                    // Add a disabled option showing no regencies found
                                    var opt = document.createElement('option');
                                    opt.value = "0"
                                    opt.innerHTML = "Tidak ada regency ditemukan";
                                    opt.disabled = true;
                                    opt.style.backgroundColor = "grey";
                                    wilayahEl.appendChild(opt);
                                }
                            }).catch(function (err) {
                                console.error('Error fetching regencies:', err);
                                // Show error option
                                var opt = document.createElement('option');
                                opt.value = "0"
                                opt.innerHTML = "Error memuat data";
                                opt.disabled = true;
                                opt.style.backgroundColor = "grey";
                                wilayahEl.appendChild(opt);
                                
                                iziToast.show({
                                    title: 'Error',
                                    message: 'Gagal memuat data kabupaten/kota. Silakan coba lagi.',
                                    color: 'red'
                                });
                            });

                        })

                        var namaPemdaGG

                        g.labelsgo()

                        var submitEl = r.getById('submitBtn')
                        submitEl.addEventListener('click', (e) => {
                            e.preventDefault()
                            var inputs = [...r.getByTag('input')]
                            console.log(inputs)
                            var inputArr = []
                            inputArr.push(r.phaseEmail)
                            inputArr.push(r.getById('wilayah').value)


                            inputs.forEach(i => {
                                inputArr.push(i.value)
                            })


                            var thingswrong = []

                            inputArr.every((v, idx) => {
                                if (idx == 1) {

                                    if (v == "0") {

                                        errTell('Pemda belum dipilih')

                                        thingswrong.push(1)
                                        return false;
                                    }
                                }

                                if (v == "") {

                                    idx == 2 ? errTell('Instansi belum diisi') :
                                        idx == 3 ? errTell('Nama belum diisi') :
                                            idx == 4 ? errTell('Jabatan belum diisi') :
                                                idx == 5 ? errTell('No HP belum diisi') :
                                                    ('No Telp Kantor belum diisi')

                                    thingswrong.push(1)
                                    return false;


                                } else if (v) {
                                    if (idx == 5) {

                                        var phoneNum = v.replace(/[^\d]/g, '');
                                        if (phoneNum.length > 8 && phoneNum.length < 14) {
                                            return true
                                        } else {
                                            errTell('No handphone tidak valid')
                                            thingswrong.push(1)
                                            return false;
                                        }
                                    }
                                }


                                return true;
                            });

                            console.log(thingswrong)
                            console.log(inputArr)

                            if (thingswrong.length == 0) {
                                var paramGet = {
                                    method: 'get',
                                    tableName: 'submitModel',
                                    json: { kodePemda: inputArr[1] },

                                }

                                r.comm2(paramGet, () => {
                                    console.log(r.dataReturn)
                                    if (r.dataReturn.success == 0) {

                                        var json = {

                                            email: inputArr[0],

                                            kodePemda: inputArr[1],
                                            nama: inputArr[2],
                                            instansi: inputArr[3],
                                            jabatan: inputArr[4],
                                            nohape: inputArr[5],
                                            telp: inputArr[6],


                                        }

                                        var namaPemda
                                        g.wilayah.forEach(w => {
                                            if (w.kode == inputArr[1]) namaPemda = w.nama
                                        })
                                        console.log(namaPemda)

                                        var textEmail = `email: ` + inputArr[0] + "\n" +

                                            `kodePemda: ` + inputArr[1] + "\n" +
                                            "namaPemda: " + namaPemda + "\n" +
                                            `nama: ` + inputArr[2] + "\n" +
                                            `instansi: ` + inputArr[3] + "\n" +
                                            `jabatan: ` + inputArr[4] + "\n" +
                                            `Ponsel: ` + inputArr[5] + "\n" +
                                            `telp: ` + inputArr[6]



                                        var paramSave = {
                                            method: "create",
                                            tableName: "submitModel",
                                            json: json
                                        }

                                        r.comm2(paramSave, () => {
                                            el.innerHTML = ''

                                            warpNOW()


                                            m.request({
                                                method: "POST",
                                                url: "/api/signup",
                                                //      headers: { "Authorization": "Guntur " + lstor.token, 'Accept': 'Accept:text/html,application/json,*/*', 'duget': du.get(), 'dupa': JSON.stringify(du.parse()) },
                                                headers: { "Authorization": "Guntur's Project", 'Accept': 'Accept:text/html,application/json,*/*' },
                                                body: { text: textEmail, kepada: inputArr[0] },
                                                responseType: 'json'
                                            }).then(data => {
                                                console.log(data)

                                                r.phase = 1
                                                m.redraw()

                                            })



                                        });


                                    } else {
                                        var namaPemda
                                        g.wilayah.forEach(w => {
                                            if (w.kode == inputArr[1]) namaPemda = w.nama
                                        })
                                        errTell('Pemda ' + namaPemda + ' sudah terdaftar dalam efin.site database. Jika Anda meyakini ada kesalahan harap hubungi +812xxxx')
                                    }
                                })
                            }



                        })


                    }
                })




            })


            var typed = new Typed('#welcome', {
                strings: ["Form Pendaftaran"],
                typeSpeed: 60,
                showCursor: false
            });

            g.labelsgo()


        }

        var imelEl

        r.tunda(() => { showBox(el) }, 1500)
        r.tunda(() => {
            imelEl = r.getById('imel')
            kirimEl = r.getById('kirim')
            imelEl.addEventListener('change', () => {


                var amel = imelEl.value

                if (g.validateEmail(amel)) {

                    var imelparts = amel.split('@')
                    console.log(imelparts, imelparts[1].includes('.com'))

                    if (imelparts[1].includes('.go.id')) {        //GO ID DISINI YA ========================================
                        // if (imelparts[1].includes('.com')) {

                        kirimEl.disabled = false

                    } else {


                        kirimEl.disabled = true
                        iziToast.show({
                            title: 'Warning',
                            message: 'Domain email bukan milik instansi pemerintah',
                            color: 'yellow'
                        });
                    }
                    console.log(imelparts)


                    // Object.assign(r, { phase: 1 })
                    // Object.assign(r, { phaseEmail: email })

                } else {

                    kirimEl.disabled = true

                    iziToast.show({
                        title: 'Warning',
                        message: 'Email tidak valid',
                        color: 'red'
                    });
                }
            })
        }, 1600)
        r.tunda(() => {

            var typed = new Typed('#imel', {
                strings: [imel],
                typeSpeed: 60,
                showCursor: true,
                onComplete: () => {

                    kirimEl = r.getById('kirim')

                    var imelparts = imel.split('@')


                    console.log(imelparts, imelparts[1].includes('.com'))

                    if (imelparts[1].includes('.go.id')) {        //GO ID DISINI YA ========================================
                        // if (imelparts[1].includes('.com')) {



                        kirimEl.disabled = false


                    } else {

                        kirimEl.disabled = true

                        iziToast.show({
                            title: 'Warning',
                            message: 'Domain email bukan milik instansi pemerintah',
                            color: 'yellow'
                        });
                    }

                }
            });

        }, 2000)





    },

    validateEmail: (email) => {
        return String(email)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
    },


    lp: [

        m("link", { "rel": "stylesheet", "href": "../css/main.css" }),

        m("style",
            `
                *, *::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: #141616;
  background-color: #e6e9ea;
  font-size: 28px;
}

h1 {
  font-size: 110px;
  margin-bottom: 1rem;
}

.full-screen-section {
  height: 100vh;
  text-align: center;
  padding: 0.5rem;
  position: relative;
}

.top-section .left,
.top-section .right {
  flex-basis: 0;
  flex-grow: 1;
  padding: 1rem;
  padding-left: 3rem;
}

.top-section {
  display: flex;
  text-align: start;
  padding: 0;
}

.top-section .left {
  background-color: rgb(248, 250, 249, var(--background-opacity));
}

.top-section .right {
  background: linear-gradient(
    210.65deg,
    rgb(12, 12, 14, var(--background-opacity)) 0%,
    rgb(223, 223, 256, var(--background-opacity)) 100%
  );
}

.imgs > .top-section-img {
  /* (oldVal - oldMin) * newRange / oldRange + newMin */
  --value: min(var(--scroll), 30) * 50 / 30;
  width: calc(50vw + 1vw * var(--value));
  transform: translateY(calc(50% - 1% * var(--value)));
}

@media (width <= 1000px) {
  .top-section .right {
    display: none;
  }

  .top-section .left {
    text-align: center;
  }

  body {
    font-size: 24px;
  }

  h1 {
    font-size: 72px;
  }

  .imgs > .top-section-img {
    width: 100vw;
  }
}

:root {
  --scroll: 0;
}

.top-section {
  position: sticky;
  top: 0;
  /* (oldVal - oldMin) * newRange / oldRange + newMin */
  translate: 0 calc(-1% * (max(var(--scroll), 25) - 25) * 100 / 75);
  --background-opacity: calc(100% - 1% * min(var(--scroll), 30) * 100 / 30);
}

.first-main-section {
  padding-top: 10vh;
}

.imgs > * {
  position: fixed;
  width: 100vw;
  bottom: 0;
  z-index: 10;
  translate: 0 100%;
  transition: translate 250ms ease-in-out;
}

.imgs > .show {
  translate: 0 0;
}

[data-img-to-show] {
  position: absolute;
  top: 20%;}    `),


        m("div", { "class": "imgs" },
            [
                m("img", { "class": "top-section-img show", "src": "img/img-1.png", "data-img": "", "id": "img-1", "max-idth": "500px" }),
                m("img", { "src": "img/img-2.png", "data-img": "", "id": "img-2" }),
                m("img", { "src": "img/noCost.png", "data-img": "", "id": "img-3" }),
                // m("img", { "src": "img/img-1.png", "data-img": "", "id": "img-4" })
            ]
        ),
        m("section", { "class": "top-section full-screen-section" },
            [
                m("div", { "class": "left" },
                    [
                        m("h1.tracking-tighter.leading-tight",
                            "Menyusun LKPD dengan sangat CEPAT!"
                        ),
                        m("p",
                            "Satu-satunya apps yang intuitif, user-friendly, dan mudah dioperasikan "
                        )
                    ]
                ),
                m("div", { "class": "right " },

                    m('.grid.gap-0.grid-flow-row.place-items-center',

                        m("img", { "src": "../img/efinCloud.svg", "width": "420px" }),

                        m("label", { "class": "form-control w-full max-w-xs" },
                            [
                                m("div", { "class": "label" },
                                    [
                                        m("span", { "class": "label-text text-white" },
                                            "Daftar sekarang?"
                                        ),
                                        // m("span", { "class": "label-text-alt" },
                                        //     "Top Right label"
                                        // )
                                    ]
                                ),
                                m('form',
                                    m('div.flex.flex-row mt-0', m("input", { "class": "input input-bordered w-full max-w-xs", "type": "email", "placeholder": "nama@instansi.go.id" }),
                                        m("button", { "class": "btn btn-md ml-1", type: "submit", onclick: (e) => g.kirim(e) },
                                            "Kirim"
                                        ),)
                                ),


                                m("div", { "class": "label" },
                                    [
                                        m("span", { "class": "label-text-alt text-white" },
                                            "mohon gunakan email instansi Anda"
                                        ),
                                        // m("span", { "class": "label-text-alt" },
                                        //     "Bottom Right label"
                                        // )
                                    ]
                                )
                            ]
                        )

                    )

                )
            ]
        ),
        m("section", { "class": "full-screen-section first-main-section" },
            [
                m("h1.tracking-tighter.mb-4",
                    "Sesuai dengan Regulasi terkini"
                ),
                m("p",
                    "Berbasis Akrual, sesuai dengan Standar Akuntansi Pemerintahan"
                ),

                // m("ul.list-disc.list-inside.text-left.tracking-tighter.ml-6.mt-6",

                //     m("li",
                //         "Undang-Undang No. 17 Tahun 2003 tentang Keuangan Negara"
                //     ),
                //     m("li",
                //         "Permendagri No. 21 tahun 2011 tentang Pedoman Pengelolaan Keuangan Daerah"
                //     ),
                //     m("li",
                //         "Peraturan Pemerintah No. 71 tahun 2010 tentang Standar Akuntansi Pemerintah (SAP)"
                //     ),
                //     m("li",
                //         "Permendagri Nomor 64 Tahun 2013 tentang Penerapan SAP Berbasis Akrual"
                //     ),

                //     m("li",
                //         "Permendagri 90 Tahun 2019 tentang Klasifikasi, Kodefikasi, dan Nomenklatur Perencanaan Pembangunan dan Keuangan Daerah"
                //     ),


                // ),

                m("div", { "data-img-to-show": "#img-1" })
            ]
        ),
        m("section", { "class": "full-screen-section" },
            [
                m("h1",
                    "Penuh dengan Fitur"
                ),
                m("p",
                    " Keamanan Data, Teknologi canggih, mendukung APIs, Report Generator "
                ),
                m("div", { "data-img-to-show": "#img-2" })
            ]
        ),
        m("section", { "class": "full-screen-section" },
            [
                m("h1",
                    "100% Gratis"
                ),
                m("p.tracking-tight",
                    "dipersembahkan demi terciptanya akuntabilitas, transparansi dan peningkatan pelayanan masyarakat"
                ),
                m("p",
                    "di seluruh pelosok INDONESIA"
                ),
                m("div", { "data-img-to-show": "#img-3" })
            ]
        ),
        m("section", { "class": "full-screen-section" },
            [
                m("h1",
                    "Daftar Sekarang"
                ),
                m('.grid.gap-0.grid-flow-row.place-items-center',

                    m("img", { "src": "../img/efinCloudBk.svg", "width": "420px" }),

                    m("label", { "class": "form-control w-full max-w-xs" },
                        [
                            m("div", { "class": "label" },
                                [
                                    m("span", { "class": "label-text text-black" },
                                        "Masukkan alamat email"
                                    ),
                                    // m("span", { "class": "label-text-alt" },
                                    //     "Top Right label"
                                    // )
                                ]
                            ),
                            m('form',
                                m('div.flex.flex-row mt-0', m("input", { "class": "input input-bordered w-full max-w-xs", "type": "email", "placeholder": "nama@instansi.go.id" }),
                                    m("button", { "class": "btn btn-md ml-1", type: "submit", onclick: (e) => g.kirim(e) },
                                        "Kirim"
                                    ),)
                            ),


                            m("div", { "class": "label mb-5" },
                                [
                                    m("span", { "class": "label-text-alt text-black" },
                                        "mohon gunakan email instansi Anda"
                                    ),
                                    // m("span", { "class": "label-text-alt" },
                                    //     "Bottom Right label"
                                    // )
                                ]
                            ),



                        ]
                    )

                ),
                m("footer", { "class": "footer items-center p-4 bg-neutral text-neutral-content" },
                    [
                        m("aside", { "class": "items-center grid-flow-col" },
                            [
                                m("img", { "src": "../img/efinCloud.svg", "width": "80px" }), ,
                                m("p",
                                    "©2023 efin.cloud. Hak Cipta dilindungi Undang-Undang"
                                )
                            ]
                        ),
                        m("nav", { "class": "grid-flow-col gap-4 md:place-self-center md:justify-self-end" },

                        )
                    ]
                ),

                m("div", { "data-img-to-show": "#img-121214" })
            ]
        ),







    ],




    kirim: (e) => {

        e.preventDefault()
        var els = [...r.getByCN('input')]
        console.log(els)
        var inputArr = []
        els.forEach(e => {
            inputArr.push(e.value)
        })

        var email
        inputArr.forEach(i => {
            if (i != "") email = i
        })

        console.log(inputArr, email)

        if (email) {

            if (g.validateEmail(email)) {

                console.log('true')
                Object.assign(r, { phase: 1 })
                Object.assign(r, { phaseEmail: email })

            } else { r.tell('warning', "Email tidak valid", 1212, () => { }) }


        } else {
            r.tell('warning', "Email tidak boleh kosong", 1212, () => { })
        }



    },

    space: [

        m("div", { "style": { "position": "realtive", "width": "100%", "height": "100%", "top": "0px", "left": "0px" } },
            [
                m("canvas", { "id": "space", "width": "100%", "height": "100%", "style": { "position": "absolute", "left": "0", "top": "0", "z-index": "10" } }),
                m("div", { "id": "layer2", "style": { "position": "absolute", "width": "100%", "left": "0", "top": "0", "z-index": "20", "transform-origin": "0 0" } },
                    m('a', { href: "#" }, m("img", { "src": "../img/efinCloud.svg", "width": "77px", onclick: () => location.replace('/') }))
                ),
                // m("a", { "href": "#", "id": "warp" }, 
                //     "warp"
                // )
            ]
        ),
        m("style",
            `html,body{height:100%;max-width:100%;margin:0;background:rgba(0,10,20,1) center no-repeat;background-size:cover;image-rendering: pixelated; font-family:sans-serif}
            #space{width:100%}
            #warp{position:absolute;z-index:9;bottom:0;left:0;right:0;margin:20px auto;color:rgba(209, 255, 255,1);border:2px solid;padding:1em;width:10em;text-align:center;font-weight:700;font-size:1.2em;display:inline-block;text-decoration:none;background:rgba(0,0,0,0.8)}`
        ),
        [
            m("script", { "src": "../js/iziToast.min.js", "type": "text/javascript" }),
            m("link", { "rel": "stylesheet", "href": "../css/iziToast.min.css" })
        ]
    ],


    //url(/img/space.jpg) 



    lpscript: () => {

        window.addEventListener("scroll", setScrollVar)
        window.addEventListener("resize", setScrollVar)

        function setScrollVar() {
            const htmlElement = document.documentElement
            const percentOfScreenHeightScrolled =
                htmlElement.scrollTop / htmlElement.clientHeight
            console.log(Math.min(percentOfScreenHeightScrolled * 100, 100))
            htmlElement.style.setProperty(
                "--scroll",
                Math.min(percentOfScreenHeightScrolled * 100, 100)
            )
        }

        setScrollVar()

        const observer = new IntersectionObserver(entries => {
            for (let i = entries.length - 1; i >= 0; i--) {
                const entry = entries[i]
                if (entry.isIntersecting) {
                    document.querySelectorAll("[data-img]").forEach(img => {
                        img.classList.remove("show")
                    })
                    const img = document.querySelector(entry.target.dataset.imgToShow)
                    img?.classList.add("show")
                    break
                }
            }
        })

        document.querySelectorAll("[data-img-to-show]").forEach(section => {
            observer.observe(section)
        })

    },

    lastPage: [



        m("div", { "class": "js-container container", "style": { "top": "0px !important", "text-align": "center", "height": "100vh", "display": "block", "justify-content": "center", "align-items": "center" } },
            [
                m("h1", { "style": { "margin-top": "10rem" } },
                    "Selamat, Anda sudah terdaftar!"
                ),
                m("h3",
                    "Periksa mailbox Anda untuk informasi login"
                ),
                m("img", { "src": "../img/efinCloudBk.svg", "alt": "efin.site", "width": "200", "height": "150" })
            ]
        ),
        m("style",
            `
            body {
                font-family: 'Roboto';
                margin: 0;
                padding: 0;
           }
            @keyframes confetti-slow {
                0% {
                    transform: translate3d(0, 0, 0) rotateX(0) rotateY(0);
               }
                100% {
                    transform: translate3d(25px, 105vh, 0) rotateX(360deg) rotateY(180deg);
               }
           }
            @keyframes confetti-medium {
                0% {
                    transform: translate3d(0, 0, 0) rotateX(0) rotateY(0);
               }
                100% {
                    transform: translate3d(100px, 105vh, 0) rotateX(100deg) rotateY(360deg);
               }
           }
            @keyframes confetti-fast {
                0% {
                    transform: translate3d(0, 0, 0) rotateX(0) rotateY(0);
               }
                100% {
                    transform: translate3d(-50px, 105vh, 0) rotateX(10deg) rotateY(250deg);
               }
           }
            .container {
                width: 100vw;
                height: 100vh;
                background: #fff;
                border: 1px solid white;
                display: fixed;
                top: 0px;
           }
            .confetti-container {
                perspective: 700px;
                position: absolute;
                overflow: scroll;
                top: 0;
                right: 0;
                bottom: 0;
                left: 0;
           }
            .confetti {
                position: absolute;
                z-index: 1;
                top: -10px;
                border-radius: 0%;
           }
            .confetti--animation-slow {
                animation: confetti-slow 2.25s linear 1 forwards;
           }
            .confetti--animation-medium {
                animation: confetti-medium 1.75s linear 1 forwards;
           }
            .confetti--animation-fast {
                animation: confetti-fast 1.25s linear 1 forwards;
           }
           /* Checkmark */
            .checkmark-circle {
                width: 150px;
                height: 150px;
                position: relative;
                display: inline-block;
                vertical-align: top;
                margin-left: auto;
                margin-right: auto;
           }
            .checkmark-circle .background {
                width: 150px;
                height: 150px;
                border-radius: 50%;
                background: #00c09d;
                position: absolute;
           }
            .checkmark-circle .checkmark {
                border-radius: 5px;
           }
            .checkmark-circle .checkmark.draw:after {
                -webkit-animation-delay: 100ms;
                -moz-animation-delay: 100ms;
                animation-delay: 100ms;
                -webkit-animation-duration: 3s;
                -moz-animation-duration: 3s;
                animation-duration: 3s;
                -webkit-animation-timing-function: ease;
                -moz-animation-timing-function: ease;
                animation-timing-function: ease;
                -webkit-animation-name: checkmark;
                -moz-animation-name: checkmark;
                animation-name: checkmark;
                -webkit-transform: scaleX(-1) rotate(135deg);
                -moz-transform: scaleX(-1) rotate(135deg);
                -ms-transform: scaleX(-1) rotate(135deg);
                -o-transform: scaleX(-1) rotate(135deg);
                transform: scaleX(-1) rotate(135deg);
                -webkit-animation-fill-mode: forwards;
                -moz-animation-fill-mode: forwards;
                animation-fill-mode: forwards;
           }
            .checkmark-circle .checkmark:after {
                opacity: 1;
                height: 75px;
                width: 37.5px;
                -webkit-transform-origin: left top;
                -moz-transform-origin: left top;
                -ms-transform-origin: left top;
                -o-transform-origin: left top;
                transform-origin: left top;
                border-right: 15px solid white;
                border-top: 15px solid white;
                border-radius: 2.5px !important;
                content: '';
                left: 25px;
                top: 75px;
                position: absolute;
           }
            @-webkit-keyframes checkmark {
                0% {
                    height: 0;
                    width: 0;
                    opacity: 1;
               }
                20% {
                    height: 0;
                    width: 37.5px;
                    opacity: 1;
               }
                40% {
                    height: 75px;
                    width: 37.5px;
                    opacity: 1;
               }
                100% {
                    height: 75px;
                    width: 37.5px;
                    opacity: 1;
               }
           }
            @-moz-keyframes checkmark {
                0% {
                    height: 0;
                    width: 0;
                    opacity: 1;
               }
                20% {
                    height: 0;
                    width: 37.5px;
                    opacity: 1;
               }
                40% {
                    height: 75px;
                    width: 37.5px;
                    opacity: 1;
               }
                100% {
                    height: 75px;
                    width: 37.5px;
                    opacity: 1;
               }
           }
            @keyframes checkmark {
                0% {
                    height: 0;
                    width: 0;
                    opacity: 1;
               }
                20% {
                    height: 0;
                    width: 37.5px;
                    opacity: 1;
               }
                40% {
                    height: 75px;
                    width: 37.5px;
                    opacity: 1;
               }
                100% {
                    height: 75px;
                    width: 37.5px;
                    opacity: 1;
               }
           }
            .submit-btn {
                height: 45px;
                width: 200px;
                font-size: 15px;
                background-color: #00c09d;
                border: 1px solid #00ab8c;
                color: #fff;
                border-radius: 5px;
                box-shadow: 0 2px 4px 0 rgba(87, 71, 81, .2);
                cursor: pointer;
                transition: all 2s ease-out;
                transition: all 0.2s ease-out;
           }
            .submit-btn:hover {
                background-color: #2ca893;
                transition: all 0.2s ease-out;
           }
            
            
            
            `
        ),
        m("script",
            " const Confettiful = function(el) { this.el = el; this.containerEl = null; this.confettiFrequency = 3; this.confettiColors = ['#EF2964', '#00C09D', '#2D87B0', '#48485E','#EFFF1D']; this.confettiAnimations = ['slow', 'medium', 'fast']; this._setupElements(); this._renderConfetti(); }; Confettiful.prototype._setupElements = function() { const containerEl = document.createElement('div'); const elPosition = this.el.style.position; if (elPosition !== 'relative' || elPosition !== 'absolute') { this.el.style.position = 'relative'; } containerEl.classList.add('confetti-container'); this.el.appendChild(containerEl); this.containerEl = containerEl; }; Confettiful.prototype._renderConfetti = function() { this.confettiInterval = setInterval(() => { const confettiEl = document.createElement('div'); const confettiSize = (Math.floor(Math.random() * 3) + 7) + 'px'; const confettiBackground = this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)]; const confettiLeft = (Math.floor(Math.random() * this.el.offsetWidth)) + 'px'; const confettiAnimation = this.confettiAnimations[Math.floor(Math.random() * this.confettiAnimations.length)]; confettiEl.classList.add('confetti', 'confetti--animation-' + confettiAnimation); confettiEl.style.left = confettiLeft; confettiEl.style.width = confettiSize; confettiEl.style.height = confettiSize; confettiEl.style.backgroundColor = confettiBackground; confettiEl.removeTimeout = setTimeout(function() { confettiEl.parentNode.removeChild(confettiEl); }, 3000); this.containerEl.appendChild(confettiEl); }, 25); }; window.confettiful = new Confettiful(document.querySelector('.js-container')); "
        )



    ],

    starload: null,

    onupdate: () => {

        console.log(r.phase)

        if (r.phase == 0) {


            if (g.starload == null) {
                g.stars(r.phaseEmail)
                g.starload = 1
            }

            // var layerEl = document.getElementById('layer2')
            // if(layerEl){
            //     function fillWithText () {
            //         var fill = document.getElementById('box1');
            //         var container = layerEl;

            //         var totalHeight = container.clientHeight;
            //         var totalWidth = container.clientWidth;

            //         var currentHeight = fill.clientHeight;
            //         var currentWidth = fill.clientWidth;

            //         var scaleX = totalWidth / currentWidth;
            //         var scaleY = totalHeight / currentHeight;

            //        // fill.style.transform = 'scale(' + scaleX + ',' + scaleY + ')';
            //         fill.style.transform = 'scale(' + 1 + ',' + 1 + ')';
            //       };
            //     //   window.addEventListener('resize', fillWithText, false);
            //     //   fillWithText();
            // }
        }

    },

    oninit: () => {

        r.phase ? null : Object.assign(r, { phase: 0 })
        var itemStr = sessionStorage.getItem("efinCloud");
        var item = JSON.parse(itemStr)
        console.log('efinCloud sessionStorage item:', item)
        Object.assign(r, { phaseEmail: item.email })
        console.log('phaseEmail set to:', r.phaseEmail)

        console.log('=== SESSION STORAGE DEBUG ===');
        
        // Check efinSite sessionStorage
        var efinSiteStr = sessionStorage.getItem("efinSite");
        console.log('efinSite sessionStorage raw:', efinSiteStr);
        
        if (efinSiteStr) {
            try {
                var efinSiteItem = JSON.parse(efinSiteStr);
                console.log('efinSite parsed:', efinSiteItem);
                console.log('wilayah property:', efinSiteItem.wilayah);
                console.log('wilayah length:', efinSiteItem.wilayah ? efinSiteItem.wilayah.length : 'undefined');
                g.wilayah = efinSiteItem.wilayah;
            } catch (e) {
                console.error('Error parsing efinSite sessionStorage:', e);
                g.wilayah = [];
            }
        } else {
            console.error('efinSite not found in sessionStorage');
            g.wilayah = [];
        }
        
        console.log('Final g.wilayah:', g.wilayah);
        console.log('=== END SESSION STORAGE DEBUG ===');

    },


    oncreate: () => {



        console.log(r.phase, r.phaseEmail)

        if (r.phase == 0) {
            if (g.starload == null) {
                g.stars(r.phaseEmail)
                g.starload = 1
            }



        }

        // var prm = {
        //     method: "getAll",
        //     tableName: "wilModel"
        // }

        // r.comm2(prm, () => {
        //     if (r.dataReturn.success == 1) {
        //         g.wilayah = [...r.dataReturn.message]

        //         console.log(g.wilayah)

        //     }
        // })

        //tekan 





    },

    view: () => {



        return r.phase == 0 ? g.space : g.lastPage
        //return r.phase == 0 ? g.lp : stars()

    }

}

m.mount(document.body, g)



// stars()