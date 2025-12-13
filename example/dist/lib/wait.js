

// function wait(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

// var sini = document.getElementById('wait')

// var est = "establishing connection to database server, please wait... "



// var timeleft = 10;
// var downloadTimer = setInterval(function(){
//   if(timeleft <= 0){
//     clearInterval(downloadTimer);
//   }
//   document.getElementById("progressBar").value = 10 - timeleft;
//   timeleft -= 1;
// }, 1000); 

setTimeout(() => {
    location.reload();
}, 1500);
