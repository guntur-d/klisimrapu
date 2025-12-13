
const footer = {

  view: () => {

    return m("footer", { "class": "footer p-10 bg-base-200 text-base-content" },
      [
        m("div", { class: "flex flex-col justify-center items-center my-6" },
          [m('a', { href: "https://www.solusiti.com" }, m("img", { src: "/img/STI.png", "width": "88", "height": "78", })),

          m("p.text-lg",

            "Solusi Teknologi Informasi"),
          m("p.font-extrabold",
            "Providing reliable tech since long time ago")


          ]
        ),
        m("div",
          [
            m("span", { "class": "footer-title" },
              "Jasa Layanan"
            ),
            m("a", { "class": "link link-hover" },
              "Merk"
            ),
            m("a", { "class": "link link-hover" },
              "Disain"
            ),
            m("a", { "class": "link link-hover" },
              "Pemasaran"
            ),
            m("a", { "class": "link link-hover" },
              "Periklanan"
            )
          ]
        ),
        m("div",
          [
            m("span", { "class": "footer-title" },
              "Company"
            ),
            m("a", { "class": "link link-hover" },
              "Tentang"
            ),
            m("a", { "class": "link link-hover" },
              "Contact"
            ),
            m("a", { "class": "link link-hover" },
              "Jobs"
            ),
            m("a", { "class": "link link-hover" },
              "Press kit"
            )
          ]
        ),
        m("div",
          [
            m("span", { "class": "footer-title" },
              "Legal"
            ),
            m("a", { "class": "link link-hover" },
              "Terms of use"
            ),
            m("a", { "class": "link link-hover" },
              "Privacy policy"
            ),
            m("a", { "class": "link link-hover" },
              "Cookie policy"
            )
          ]
        )
      ]
    )
  }

}

export default footer

