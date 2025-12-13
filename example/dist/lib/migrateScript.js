function isEmail(email) {
   var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
   return regex.test(email);
}

$("#ThemeableButton5").click(() => {

   var inputArr = []
   $(".kontakform").each(function (index, element) {
      inputArr.push($(this).val());
   });

   var urut = ['Nama', 'Email', 'Subyek', 'Pesan']
   var no_go = []
   inputArr.forEach((c, i) => {

      if (c == "") {

         no_go.push(i)

         $.toast({
            heading: 'Warning ',
            text: ' mohon isi ' + urut[i],
            showHideTransition: 'fade',
            icon: 'warning',
            position: 'mid-center',
         })

      } else {
         if (i == 1) {
            if (isEmail(c)) {

               var imelparts = c.split('@')
               console.log(imelparts)

               if (imelparts[1].includes('.go.id')) {



                  $.toast({
                     heading: 'Sukses!',
                     text: ' mengirimkan data ...',
                     showHideTransition: 'fade',
                     icon: 'success',
                     position: 'mid-center',
                  })


                  var json = {
                     nama: inputArr[0],
                     email: inputArr[1],
                     subyek: inputArr[2],
                     pesan: inputArr[3],
                  }

                  fetch("/api/service", {
                     method: "POST",
                     body: JSON.stringify({
                        method: "create",
                        tableName: "kontakModel",
                        json: json
                     }),
                     headers: {
                        "Content-type": "application/json; charset=UTF-8"
                     }
                  })
                     .then((response) => {
                        response.json()
                        console.log(response, response.status)

                        var textEmail = `email: ` + inputArr[0] + "\n" +

                           `nama: ` + inputArr[0] + "\n" +
                           `email: ` + inputArr[1] + "\n" +
                           `subyek: ` + inputArr[2] + "\n" +
                           `pesan: ` + inputArr[3] + "\n"

                        fetch("/api/kontak", {
                           method: "POST",
                           body: JSON.stringify({
                              text: textEmail
                           }),
                           headers: {
                              "Content-type": "application/json; charset=UTF-8"
                           }
                        })

                           .then(res => {
                              console.log(res.status)

                              localStorage.setItem("efinCloud", JSON.stringify({ 'email': inputArr[1] }));
                              const text = inputArr[1]

                              async function digestMessage(message) {
                                 const hashHex = btoa(message)
                                  
                                 return hashHex;
                              }

                              digestMessage(text).then((digestHex) => {
                                 console.log(digestHex)
                                 window.location.href = "/daftar/" + digestHex

                              });

                           })

                     })
                  // .then((data) => {
                  //    console.log(data)
                  // })

               } else {
                  no_go.push(i)
                  $.toast({
                     heading: 'Warning ',
                     text: ' mohon menggunakan email berdomain instansi pemerintah',
                     showHideTransition: 'fade',
                     icon: 'warning',
                     position: 'mid-center',
                  })
               }

            } else {
               no_go.push(i)
               $.toast({
                  heading: 'Error ',
                  text: ' Email tidak valid!',
                  showHideTransition: 'fade',
                  icon: 'error',
                  position: 'mid-center',
               })
            }
         }
      }

   })

   if (no_go.length == 0) {
      console.log(no_go, "lanjooot")
   }

})

$(".emailbtn").click(function () {

   var emails = ['']

   $('.emailform').each(function (index) {
      emails.push($(this).val())
   });

   let longestLength = 0;
   let longestValue = null;

   const primitives = ['string', 'number', 'bigint', 'boolean'];

   emails.forEach(value => {

      if (primitives.includes(typeof value)) {
         const valueLength = value.toString().length;
         if (valueLength > longestLength) {
            longestLength = valueLength;
            longestValue = value;
         }
      }
   });

   console.log(longestValue)

   if (longestValue != null) {
      if (isEmail(longestValue)) {

         localStorage.setItem("efinCloud", JSON.stringify({ 'email': longestValue }));
         const text = longestValue

         async function digestMessage(message) {
            const hashHex = btoa(message)
            return hashHex;
         }

         digestMessage(text).then((digestHex) => {
            console.log(digestHex)
            window.location.href = "/daftar/" + digestHex

         });


      } else {
         $.toast({
            heading: 'Error',
            text: ' maaf email tidak valid',
            showHideTransition: 'fade',
            icon: 'error',
            position: 'mid-center',
         })
      }
   } else {
      $.toast({
         heading: 'Warning',
         text: ' mohon isi email',
         showHideTransition: 'fade',
         icon: 'warning',
         position: 'mid-center',
      })
   }

});


// <link href="/migrate/css/efincloud-fontawesome6.min.css" rel="stylesheet">
// <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
// <link href="/migrate/css/efincloud-eFinCloud.css" rel="stylesheet">
// <link href="/migrate/css/efincloud-index.css" rel="stylesheet">
// <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.css"
//    integrity="sha512-wJgJNTBBkLit7ymC6vvzM1EcSWeM9mmOu+1USHaRBbHkm6W9EgM0HY27+UtUaprntaYQJF75rc8gjxllKs5OIQ=="
//    crossorigin="anonymous" referrerpolicy="no-referrer" />

// <script src="/migrate/js/.-4370-jquery-3.7.1.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.js"
//    integrity="sha512-zlWWyZq71UMApAjih4WkaRpikgY9Bz1oXIW5G0fED4vk14JjGlQ1UmkGM392jEULP8jbNMiwLWdM8Z87Hu88Fw=="
//    crossorigin="anonymous" referrerpolicy="no-referrer"></script>
// <script src="/migrate/js/.-4978-wb.parallax.min.js"></script>
// <script src="/migrate/js/.-597-popper.min.js"></script>
// <script src="/migrate/js/.-7068-bootstrap.min.js"></script>
// <script src="/migrate/js/.-3738-wwb19.min.js"></script>
// <style type="text/css">
//    .showpointer {
//       cursor: pointer;
//    }
// </style>