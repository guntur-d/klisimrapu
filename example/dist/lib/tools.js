import r from './ref.js'
 

console.log('loaded index')



var g = {

    
 
    klik : ()=>{

        var param = {
            method: "getAll",
            tableName : "allwilModel"
        }

        r.comm2(param,()=>{
            // console.log(r.dataReturn)

            var allwils = [...r.dataReturn.message]
            allwils = r.customSort(allwils,'kode')
            var wilayah = []
            allwils.forEach(w=>{
                if(w.kode.length<6){
                    if(w.kode.length==2){w.nama = "Provinsi "+w.nama}
                    w.nama = w.nama.split(" ").map(([firstChar,...rest])=>firstChar.toUpperCase()+rest.join("").toLowerCase()).join(" ")
                    wilayah.push(w)
                }
            })

            console.log(wilayah)

            var crPar = {
                method:"create",
                tableName : "wilModel",
                json : wilayah
            }

            r.comm2(crPar, ()=>{
                console.log(r.dataReturn)
            })
        })


    },



    oninit: () => {

        

    },

  

    

    onupdate: () => {

       

    },

    oncreate: () => {



      

    },

    view: () => {



        return m("button", {"type":"button", onclick:()=>g.klik()}, 
        "Click Me!"
      )
    }

}

m.mount(document.body, g)


// stars()