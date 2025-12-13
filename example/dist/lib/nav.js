import r from './ref.js'


var lo = () => {
  r.tell('query', 'Anda yakin akan keluar?', 20000, () => {
    sessionStorage.removeItem(r.lsname)
    r.idUser = null
    r.admMenu = null
    r.logged = null
    r.username = null
    r.fullname = null
    r.loginBtnDisabled = false
    r.tell('success', 'User telah log out', 877, () => {
      
      m.route.set('/')
      m.redraw()
    })
  })
}

var nav = {
  oninit: () => {
    r.checkAdm(() => {
      console.log(r.logged, r.admMenu, r.admin)
    })
  },

  oncreate: () => {

    document.documentElement.addEventListener('click', (e) => {

      if (e.target.tagName == "HTML") {
        var tags = [...r.getByTag('details')]

        if (tags) {
          var sums = [...r.getByTag('summary')]
          if (sums && sums.length > 0) {
            tags[0].removeAttribute('open')
          }
        }
      }



    }, true);

  },

  admBurger: [

    m('a', 'Obyek Transaksi'),
    m('ul', { class: 'p-2' }, [
      m('li', m('a', { onclick: () => m.route.set('/md_employees') }, 'Karyawan')),
      m('li', m('a', 'Vendor/Supplier'))
    ]),
    m('li', m('a', 'Item 1')),
    m('li', [
      m('a', 'Parent'),
      m('ul', { class: 'p-2' }, [
        m('li', m('a', 'Submenu 1')),
        m('li', m('a', 'Submenu 2'))
      ])
    ]),
    m('li', m('a', 'Item 3'))
  ],

  admMenu: {
    view: () => [

      m('li', { tabindex: '0' },
        m('details', [
          m('summary', 'Master/Setup'),
          m('ul', { class: 'p-2' }, [
            m('li', m('a', {
              onclick: () => {
                r.closeDDowns();
                m.route.set('/pemda');
              }
            }, "Pemda")),
            m('li', m('a', {
              onclick: () => {
                r.closeDDowns();
                m.route.set('/kegiatan');
              }
            }, "Kegiatan")),
            m('li', m('a', {
              onclick: () => {
                r.closeDDowns();
                m.route.set('/ta');
              }
            }, "Tenaga Ahli")),
            m('li', m('a', {
              onclick: () => {
                r.closeDDowns();
                m.route.set('/libur');
              }
            }, "Hari Libur")),
          ])
        ])
      ),
      m('li', m('a', {
        onclick: () => {
          r.closeDDowns();
          m.route.set('/task');
        }
      }, 'Penugasan'))
    ]
  },


  view: () => {
    return m('div', { class: 'navbar bg-base-200' }, [
      m('div', { class: 'navbar-start' }, [
        m('div', { class: 'dropdown' }, [
          m(
            'label',
            { class: 'btn btn-ghost lg:hidden', tabindex: '0' },
            m(
              'svg',
              {
                class: 'h-5 w-5',
                xmlns: 'http://www.w3.org/2000/svg',
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor'
              },
              m('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M4 6h16M4 12h8m-8 6h16'
              })
            )
          ),
          m(
            'ul',
            {
              class:
                'menu menu-sm dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52',
              tabindex: '0'
            },
            r.admMenu ? nav.admBurger : null
          )
        ]),
        m('a', {
          class: 'btn btn-ghost normal-case text-xl', onclick: () => {

            r.username ? r.loginBtnDisabled = true : r.loginBtnDisabled = false

            m.route.set('/')

          }
        },    m("img", {src:"/img/STI.png", "width":44*1.5+"","height":39*1.5+""}),)
      ]),
      m(
        'div',
        { class: 'navbar-center hidden lg:flex' },
        m(
          'ul',
          { class: 'menu menu-horizontal px-1 z-10' },
          r.admMenu ? m(nav.admMenu) : null
        )
      ),
      m(
        'div',
        { class: 'navbar-end' },

        m('input', {
          class: 'toggle',
          type: 'checkbox',
          onclick: () => {
            var tog = [...r.getByCN('toggle')]

            if (tog[0].checked) {
              document.documentElement.setAttribute('data-theme', 'dark')
            } else {
              document.documentElement.removeAttribute('data-theme')
            }
          }
        }),

        r.username ? m("div", { "class": "dropdown dropdown-end ml-2" },
          [
            m("label", { "class": "btn m-1", "tabindex": "0" },
              r.username
            ),
            m("ul", { "class": "dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52", "tabindex": "0" },
              [
                m("li",
                  m("a", { onclick: () => lo() },
                    "Log out"
                  )
                ),
                // m("li", 
                //   m("a", 
                //     "Item 2"
                //   )
                // )
              ]
            )
          ]
        ) : m('a', {
          class: 'btn ml-2', disabled: r.loginBtnDisabled, onclick: () => {
            m.route.set('/login')
          }
        }, 'Sign in')
      )
    ])
  }
}

export default nav
