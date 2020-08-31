import shortid from "shortid";
import {firestore} from "firebase-admin";

import {Product} from "../types";
import cache from "../cache";
import schemas from "../schemas";

import {database} from "~/firebase/admin";
import {ClientTenant} from "~/tenant/types";

const api = {
  list: async (tenant: ClientTenant["id"]): Promise<Product[]> => {
    return (
      cache.get(tenant) ||
      database
        .collection("tenants")
        .doc(tenant)
        .collection("products")
        .get()
        .then((snapshot) => snapshot.docs.map((doc) => ({...(doc.data() as Product), id: doc.id})))
        .then((products) => {
          // @TODO: Remove once visibility is widely adopted
          const parsed = products.map((product) =>
            schemas.client.fetch.cast({
              ...product,
              visibility: product.available === false ? "unavailable" : product.visibility,
            }),
          );

          cache.set(tenant, parsed);

          return parsed;
        })
    );
  },
  create: (tenant: ClientTenant["id"], product: Product) => {
    return api.populate(tenant);
    
    const casted = schemas.server.create.cast(product);

    return database
      .collection("tenants")
      .doc(tenant)
      .collection("products")
      .add(casted)
      .then((snapshot) => {
        const product: Product = {...casted, id: snapshot.id};

        // @TODO: Flip with commented line depending on firebase quota usage
        // cache.remove(tenant);
        cache.add(tenant, product);

        return product;
      });
  },
  remove: (tenant: ClientTenant["id"], product: Product["id"]) =>
    database
      .collection("tenants")
      .doc(tenant)
      .collection("products")
      .doc(product)
      .delete()
      .then(() => {
        // @TODO: Flip with commented line depending on firebase quota usage
        // cache.remove(tenant);
        cache.pluck(tenant, product);

        return product;
      }),
  update: (tenant: ClientTenant["id"], {id, ...product}: Product) => {
    const casted = schemas.server.update.cast(product);

    return database
      .collection("tenants")
      .doc(tenant)
      .collection("products")
      .doc(id)
      .update({
        ...casted,
        // @TODO: Remove once visibility is widely adopted
        available: firestore.FieldValue.delete(),
      })
      .then(() => {
        // @TODO: Flip with commented line depending on firebase quota usage
        // cache.remove(tenant);
        cache.update(tenant, id, casted);

        return casted;
      });
  },
  upsert: (tenant: ClientTenant["id"], products: Product[]) => {
    const batch = database.batch();

    const commited = products.map((product) => {
      if (product.id) {
        const {id, ...formatted} = schemas.server.update.cast(product);

        batch.update(
          database.collection("tenants").doc(tenant).collection("products").doc(id),
          formatted,
        );

        return {id, ...formatted};
      } else {
        const formatted = schemas.server.create.cast(product);
        const docId = shortid.generate();

        batch.create(
          database.collection("tenants").doc(tenant).collection("products").doc(docId),
          formatted,
        );

        return {id: docId, ...formatted};
      }
    });

    return batch.commit().then(() => {
      // @TODO: Flip with commented line depending on firebase quota usage
      // cache.remove(tenant);

      const products = commited.map(({id, ...product}) => {
        cache.update(tenant, id, product);

        return {id, ...product};
      });

      return products;
    });
  },
  populate: async (tenant: ClientTenant["id"]) => {
    const batch = database.batch();
    
    const products = [
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335119/blondies/xn0prfnmxbtmsprvizw7.jpg",
        "featured": false,
        "description": "Pan casero + Pollo rebozado panko + Tomate + Lechuga",
        "category": "Hamburguesas",
        "options": [
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Papas fritas",
                        "id": "4PDt_h_Hsx"
                    },
                    {
                        "id": "-W6fFdoWn",
                        "title": "Ensalada de Verdes",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Acompañamiento",
                "id": "CkcW2Ox80",
                "type": "single"
            },
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Mayonesa",
                        "id": "TpMKV-17Lj"
                    },
                    {
                        "price": 0,
                        "id": "_ZpCxKyHO",
                        "title": "Ketchup"
                    },
                    {
                        "title": "Mostaza",
                        "price": 0,
                        "id": "5uplioQcF"
                    },
                    {
                        "id": "MtbtCV974",
                        "title": "Salsa bbq",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Aderezos",
                "id": "meTcfmcKv",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 330,
        "title": "Hamburguesa Pollo Crispy (Incluye papas fritas)",
        "visibility": "available",
        "id": "1fxfHfWOThn03siV8fHx",
        "subcategory": "Pollo"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1591192934/blondies/xmjtmegwahuedstnirqt.jpg",
        "featured": false,
        "description": "Scone de Queso",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 170,
        "title": "Scone de Queso por unidad",
        "visibility": "available",
        "id": "2FnpBNCoxXlttG9jmejS",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1598011057/blondies/zbepeutkalkwzh5gloe4.jpg",
        "featured": false,
        "description": "Bebidas:\n\n* Te en Hebras Saquito Indra o Café de Especialidad en Saquito Puerto Blest. \n* Jugo de Naranja exprimido en Botella 250 cc.\n\nComestible:  \n\n* Cuadrado dulce a elección (Cheesecake clásico, Cheesecake Dulce de Leche, Cheesecake Oreo, Ganache de Chocolate, Carrot Cake, Brownie, Blondie)\n\n* 2 Scones Queso Parmesano.\n\n*Packaging y tarjeta personalizada",
        "category": "Dia del Maestro",
        "options": [
            {
                "options": [
                    {
                        "id": "eusp0UhFvy",
                        "price": 0,
                        "title": "Cuadrado Cheesecake  Clasico"
                    },
                    {
                        "price": 0,
                        "id": "r1vPbGAh6L",
                        "title": "Cuadrado Cheesecake Oreo"
                    },
                    {
                        "id": "CtF1EGJUT",
                        "price": 0,
                        "title": "Cuadrado Cheesecake de Dulce de Leche"
                    },
                    {
                        "price": 0,
                        "id": "fIfhpJsEu",
                        "title": "Cuadrado Carrot Cake"
                    },
                    {
                        "id": "rf3eE8dim",
                        "price": 0,
                        "title": "Cuadrado Ganache de Chocolate"
                    },
                    {
                        "title": "Cuadrado Oreo",
                        "price": 0,
                        "id": "Xff0H0Ja1"
                    },
                    {
                        "id": "U6XpMXaHz",
                        "title": "Cuadrado Brownie",
                        "price": 0
                    },
                    {
                        "id": "4F_bQ9Vje",
                        "title": "Cuadrado Blondies",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": true,
                "value": [],
                "title": "Eleccion Cuadrado Dulce",
                "id": "fY52q7eZe"
            }
        ],
        "originalPrice": 0,
        "price": 700,
        "title": "Desayuno o Merienda dia del Maestro opción chica",
        "visibility": "available",
        "id": "2WsrRflUA59H399XIepV"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334767/blondies/y0sr0pq7vxirga0f8wc3.jpg",
        "featured": false,
        "description": "Cheesecake Dulce de Leche",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 240,
        "title": "Cuadrado Cheesecake de Dulce de Leche",
        "visibility": "available",
        "id": "3JFOp0sda0oAGYdl63My",
        "available": true,
        "subcategory": "Cuadrados Dulces"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334484/blondies/zc0fqerw6ftrudt08myo.jpg",
        "featured": false,
        "description": "Cafe 100% Arabica Blend Blondies",
        "category": "Cafeteria",
        "options": [],
        "originalPrice": 0,
        "price": 120,
        "title": "Cafe con Leche",
        "visibility": "available",
        "id": "3OKDIyCrxOhVrWZgO17v",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590409655/blondies/hgrmivy7pew5e75eccon.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [
            {
                "options": [
                    {
                        "id": "aFGCMjeOwk",
                        "price": 0,
                        "title": "Oreo "
                    },
                    {
                        "id": "8kKxnGNuK",
                        "price": 0,
                        "title": "Chocolate"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elegi la opcion",
                "id": "MaluZYLsS",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 260,
        "title": "Milkshake ",
        "visibility": "available",
        "id": "3WCvY4DzY86FVsS9BzUk",
        "available": true,
        "subcategory": "Milkshake"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334462/blondies/gaz5htpsxtw2tsrqqpue.jpg",
        "featured": false,
        "description": "Cafe 100% Arabica Blend Blondies",
        "category": "Cafeteria",
        "options": [],
        "originalPrice": 0,
        "price": 110,
        "title": "Cafe Americano",
        "visibility": "available",
        "id": "3WIRdS341siQSvBmEptX",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334269/blondies/l6oz8wpiszrdmpjujk22.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 85,
        "title": "Agua con gas 500 cc",
        "visibility": "available",
        "id": "4TUwi3egmOr95LKtNo06",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334524/blondies/grlkmxcg8sjew7mytnrn.jpg",
        "featured": false,
        "description": "Cafe 100% Arabica Blend Blondies",
        "category": "Cafeteria",
        "options": [],
        "originalPrice": 0,
        "price": 135,
        "title": "Capuccino Italiano ",
        "visibility": "available",
        "id": "51SjUXTzE4HhU2bt4iTd",
        "available": true,
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335134/blondies/r9egycmhpywfnogo058p.jpg",
        "featured": false,
        "description": "Pan Casero + Pollo Rebozado + Tomate + Lechuga + Guacamole + Papas Fritas",
        "category": "Hamburguesas",
        "options": [
            {
                "options": [
                    {
                        "id": "9rc2QWfNNM",
                        "title": "Papas fritas",
                        "price": 0
                    },
                    {
                        "id": "b2lCNP460",
                        "price": 0,
                        "title": "Ensalada de Verdes"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Acompañamiento",
                "id": "j7cF1-2Wg",
                "type": "single"
            },
            {
                "options": [
                    {
                        "price": 0,
                        "id": "2CiU9RqJO9",
                        "title": "Mayonesa"
                    },
                    {
                        "price": 0,
                        "id": "hLMxVJeQH",
                        "title": "Ketchup"
                    },
                    {
                        "id": "yGRtOvRph",
                        "price": 0,
                        "title": "Mostaza"
                    },
                    {
                        "id": "0o8K8oXTe",
                        "price": 0,
                        "title": "Salsa bbq"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Aderezos",
                "id": "7se3-KLXY",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 340,
        "title": "Hamburguesa Pollo Crispy Guacamole",
        "visibility": "available",
        "id": "5E0QS99ubltKzFCxOQON",
        "subcategory": "Pollo"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590410358/blondies/we1wliozsdzfxymapzye.jpg",
        "featured": false,
        "description": "4 Platos a elección + 4 Bebidas + 4 Postres",
        "category": "Combo del dia",
        "options": [
            {
                "options": [
                    {
                        "title": "Wok de Pollo",
                        "id": "-EeVK5LUSy",
                        "price": 0
                    },
                    {
                        "id": "BljmF6g67F",
                        "price": 0,
                        "title": "Wok de Carne"
                    },
                    {
                        "price": 0,
                        "id": "l5bW4yQga",
                        "title": "Wok vegetariano"
                    },
                    {
                        "price": 0,
                        "id": "Z5LZDLdzT",
                        "title": "Wrap de Pollo"
                    },
                    {
                        "title": "Wrap de Carne",
                        "price": 0,
                        "id": "8dy7NgigG"
                    },
                    {
                        "id": "cshEsVKCq",
                        "title": "Wrap Vegetariano",
                        "price": 0
                    },
                    {
                        "id": "k7P0Mkh9f",
                        "price": 0,
                        "title": "Hamburguesa Clásica "
                    },
                    {
                        "price": 0,
                        "title": "Hamburguesa Crispy de Pollo",
                        "id": "7NeQvjo-o"
                    },
                    {
                        "price": 0,
                        "title": "Ensalada Blondies",
                        "id": "RQoTtCeJV"
                    },
                    {
                        "price": 0,
                        "title": "Ensalada de Calabaza",
                        "id": "j4E7gm0jf"
                    },
                    {
                        "id": "xyhGHRR_e",
                        "price": 0,
                        "title": "Ensalada Caesar"
                    }
                ],
                "count": 4,
                "required": false,
                "value": [],
                "title": "Eleccion de platos",
                "id": "WRkk33_1t",
                "type": "multiple"
            },
            {
                "options": [
                    {
                        "id": "ZeD6sDFNmg",
                        "title": "Coca Cola ",
                        "price": 0
                    },
                    {
                        "id": "uiqLEbrDsd",
                        "title": "Coca Cola Light",
                        "price": 0
                    },
                    {
                        "title": "Coca Cola Zero",
                        "price": 0,
                        "id": "JOyNloKwYE"
                    },
                    {
                        "id": "li261G004",
                        "title": "Sprite",
                        "price": 0
                    },
                    {
                        "id": "1Amzh4QKo",
                        "title": "Agua con Gas",
                        "price": 0
                    },
                    {
                        "id": "XGT3h7IJS",
                        "price": 0,
                        "title": "Agua sin Gas"
                    }
                ],
                "count": 4,
                "required": false,
                "value": [],
                "title": "Elección de Bebida",
                "id": "9HB-F9GPC",
                "type": "multiple"
            },
            {
                "options": [
                    {
                        "id": "psZVx0TvS8",
                        "title": "Postre del dia",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion de postre",
                "id": "_dF2fpHE1",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 1370,
        "title": "Combo del dia comen 4 personas (Lunes a Viernes)",
        "visibility": "available",
        "id": "5LVpABBmmOEsjMN3SbbT",
        "subcategory": ""
    },
    {
        "price": 350,
        "featured": false,
        "options": [],
        "description": "Tiras de Carne + Arroz Yamani + Verduras + Salsa de Soja",
        "visibility": "available",
        "originalPrice": 0,
        "subcategory": "Carne",
        "title": "Wok de Carne",
        "category": "Woks",
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590414273/blondies/yjp1vhu7e1oqzaihvmis.jpg",
        "id": "5xzhiSDf5UNMRKKVWeUQ"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590414187/blondies/rcwpu1zsjxmfestzasbg.jpg",
        "featured": false,
        "description": "6 Cookies de Chispas de Chocolate RECIEN HORNEADAS.100% artesanales sin agregados.",
        "category": "Pasteleria",
        "options": [],
        "originalPrice": 0,
        "price": 300,
        "title": "Pack x 6 de Cookies de Chispas de Chocolate",
        "visibility": "available",
        "id": "6kYnkDy1IXLeoUbmVOSn",
        "subcategory": "Cookies",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334734/blondies/hdcxg0njifowuubdxd5j.jpg",
        "featured": false,
        "description": "Carrot Cake",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 240,
        "title": "Cuadrado Carrot Cake",
        "visibility": "available",
        "id": "7B6PVXTTsVmx9dfX652W",
        "subcategory": "Cuadrados Dulces",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590411613/blondies/suxz6hrhqteyqdka69pd.jpg",
        "featured": false,
        "description": "Salmon ahumado + Mix de verdes + Palta + Pepino",
        "category": "Ensaladas",
        "options": [],
        "originalPrice": 0,
        "price": 350,
        "title": "Ensalada de Salmon ahumado",
        "visibility": "available",
        "id": "7dXMqkbkSc1XPH8v0TKI",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590413617/blondies/t1jzyqynllgf8bobtdmw.jpg",
        "featured": false,
        "description": "Pack x 6 Cookies de Chocolate y Nuez recién horneadas. 100% artesanales sin agregados.",
        "category": "Pasteleria",
        "options": [],
        "originalPrice": 0,
        "price": 300,
        "title": "Pack x 6 Cookies de Chocolate y Nuez recién horneadas",
        "visibility": "available",
        "id": "7kRtNK3A4L4cocuYI9Go",
        "available": true,
        "subcategory": "Cookies"
    },
    {
        "options": [],
        "id": "8DggmNAhQQDSsF4LsBQx",
        "category": "Desayunos y Meriendas",
        "subcategory": "Cuadrados Dulces",
        "title": "Cuadrado Brownie",
        "visibility": "available",
        "price": 170,
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334712/blondies/wfcdrhiplpacaceaueub.jpg",
        "originalPrice": 0,
        "featured": false,
        "description": "Brownie"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334280/blondies/zp5tg79vghp7d7e018us.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 85,
        "title": "Agua sin gas 500 cc",
        "visibility": "available",
        "id": "8uzyIjCoW78tmnlTpLRU",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1598869726/blondies/rhhwvbfgm2qhcslqvedv.jpg",
        "featured": false,
        "description": "Kit decora tus Galletitas con Glace y Granas (3 Galletitas) + 1 Cuadrado Brownie + 1 Danesas + 2 Scone Parmesano + 3 Cookies con Chispas de Chocolate + 1 Chocolatadas 200 CC.",
        "category": "Bandejas",
        "options": [
            {
                "options": [
                    {
                        "id": "xahkd3UgrK",
                        "title": "Te Negro en Hebras Saquito",
                        "price": 70
                    },
                    {
                        "price": 70,
                        "title": "Te Verde en Hebras Saquito",
                        "id": "DrAi1m7XqW"
                    },
                    {
                        "id": "0NCvujjSM",
                        "price": 70,
                        "title": "Cafe de Especialidad Saquito"
                    },
                    {
                        "id": "ssv6lkpXU",
                        "title": "Chocolatada 200 CC",
                        "price": 80
                    },
                    {
                        "price": 100,
                        "id": "TsLKB0td5",
                        "title": "Jugo de Naranja exprimido"
                    },
                    {
                        "price": 85,
                        "id": "ZsP-3vpJ1",
                        "title": "Coca Cola 600 cc"
                    },
                    {
                        "price": 85,
                        "id": "jzyoscQvt",
                        "title": "Sprite"
                    },
                    {
                        "price": 80,
                        "id": "XgTEFGfQT",
                        "title": "Agua Mineral sin gas"
                    },
                    {
                        "price": 80,
                        "id": "xpuqWvmcK",
                        "title": "Agua Mineral con Gas"
                    }
                ],
                "count": 0,
                "required": false,
                "value": [],
                "title": "Agregar bebidas",
                "id": "CFxNFxUNZp"
            },
            {
                "options": [
                    {
                        "id": "NSxKn51AAO",
                        "price": 300,
                        "title": "Kit Cumpleaños "
                    },
                    {
                        "price": 300,
                        "id": "L6yenF8pT8",
                        "title": "Kit Cumpleaños "
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Agregar Kit Cumpleaños ",
                "id": "7aklwHAju"
            },
            {
                "options": [
                    {
                        "price": 240,
                        "id": "or68KFGfcn",
                        "title": "Cuadrado Cheesecake Clasico"
                    },
                    {
                        "id": "4yNYLgmqTD",
                        "price": 240,
                        "title": "Cuadrado Cheesecake Oreo"
                    },
                    {
                        "price": 240,
                        "id": "qdQKmlb7I",
                        "title": "Cuadrado Cheesecake Dulce de Leche"
                    },
                    {
                        "price": 260,
                        "id": "ND0fauUhX",
                        "title": "Cuadrado Ganache de Chocolate"
                    },
                    {
                        "id": "gzkDKIlz8",
                        "title": "Cuadrado Carrot Cake",
                        "price": 250
                    },
                    {
                        "id": "xsyEuBVfe",
                        "price": 185,
                        "title": "Cuadrado Oreo"
                    },
                    {
                        "id": "AKnvmOC37",
                        "price": 170,
                        "title": "Cuadrado Brownie"
                    },
                    {
                        "id": "dTZuTCCyi",
                        "title": "Cuadrado Blondies",
                        "price": 160
                    },
                    {
                        "id": "49gellF9J",
                        "title": "Danesa",
                        "price": 50
                    },
                    {
                        "price": 75,
                        "title": "Croissant",
                        "id": "LnCyE5DAE"
                    }
                ],
                "count": 0,
                "required": false,
                "value": [],
                "title": "Agregar cuadrados Dulces ",
                "id": "8IdaCjIEl"
            }
        ],
        "originalPrice": 0,
        "price": 900,
        "title": "Bandeja Niños para desayunar o merendar jugando (pedidos 24 horas anticipación)",
        "visibility": "available",
        "id": "9tye6mGcrQWiADCasurT"
    },
    {
        "subcategory": "Cerdo",
        "description": "Wok de cerdo",
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335325/blondies/uxklxbf924pd9atmfawv.jpg",
        "originalPrice": 0,
        "price": 350,
        "id": "A1Y8i5JbvvFut5y85kkp",
        "featured": false,
        "options": [],
        "title": "Wok de cerdo",
        "visibility": "available",
        "category": "Woks"
    },
    {
        "price": 120,
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1591725710/blondies/vqt0as8uv4fvdotlkirk.jpg",
        "options": [],
        "title": "Croissant de Almendra por unidad",
        "featured": false,
        "visibility": "available",
        "originalPrice": 0,
        "category": "Desayunos y Meriendas",
        "description": "Croissant con pasta de Almendras ",
        "id": "A6ddMFn7CDz4TcOna58b"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335236/blondies/ljjrujobtjevkyhfzxi6.jpg",
        "featured": false,
        "description": "Torta Bonobon",
        "category": "Pasteleria",
        "options": [],
        "originalPrice": 0,
        "price": 2500,
        "title": "Torta Bonobon Entera",
        "visibility": "available",
        "id": "AAsBrVakSmWQBKjNjg46",
        "available": true,
        "subcategory": "Tortas enteras"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590409702/blondies/r611l5nndws9yjwvqmy8.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 85,
        "title": "Sprite 600 cc",
        "visibility": "available",
        "id": "B6yptQpsHn3tME1iqQcq",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334618/blondies/tilrn0vvrqyk9lyiess3.jpg",
        "featured": false,
        "id": "BNJZzchtoPVGDRIvzBl5",
        "subcategory": "Minicakes",
        "description": "Carrot Cake (Equivale 2 porciones de torta Aprox)",
        "title": "Mini Carrot Cake (un dia antes de anticipación)",
        "category": "Cumpleanos",
        "options": [],
        "originalPrice": 0,
        "price": 900,
        "visibility": "available"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1591186594/blondies/px8klfoowogdvouduvb4.jpg",
        "featured": false,
        "description": "Medialuna o Croissant Jamon y Queso + 2 Mini Scones de Queso  + Cuadrado Dulce a eleccion + Tarjeta Dia del Padre",
        "category": "Dia del padre",
        "options": [
            {
                "options": [
                    {
                        "id": "6n8qOcA0fw",
                        "price": 0,
                        "title": "Cheesecake Clasico"
                    },
                    {
                        "price": 0,
                        "title": "Cheesecake Dulce de Leche",
                        "id": "txZIXElT9"
                    },
                    {
                        "id": "4eJQfaaR2",
                        "price": 0,
                        "title": "Cheesecake Oreo"
                    },
                    {
                        "id": "J9T2VpydK",
                        "title": "Cuadrado Ganache de Chocolate",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "id": "gRv8GEHY6",
                        "title": "Cuadrado Carrot Cake"
                    },
                    {
                        "title": "Cuadrado Blondies",
                        "id": "pvYg33fob",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "id": "9U-X9Ywg6",
                        "title": "Cuadrado Brownie"
                    },
                    {
                        "title": "Cuadrado Oreo",
                        "id": "BPEkc_gx9",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion de Cuadrado Dulce ",
                "id": "jq_FeQyUI"
            },
            {
                "options": [
                    {
                        "id": "emcF5wzYUw",
                        "title": "Cafe con Leche",
                        "price": 120
                    },
                    {
                        "title": "Cafe Americano",
                        "id": "-EwZrjLuzs",
                        "price": 110
                    },
                    {
                        "id": "-USVFWVgJ",
                        "price": 140,
                        "title": "Chocolatada Caliente"
                    },
                    {
                        "price": 160,
                        "title": "Submarino ",
                        "id": "-kDhnuZ7O"
                    },
                    {
                        "title": "Jugo de Naranja",
                        "price": 160,
                        "id": "fyfE4aP0e"
                    },
                    {
                        "price": 120,
                        "id": "yVg1-Rint",
                        "title": "Te saquito en Hebras Negro"
                    },
                    {
                        "id": "Pc-PiLsne",
                        "price": 120,
                        "title": "Te saquito en Hebras Verde"
                    },
                    {
                        "title": "Te saquito en Hebras Frutos Rojos",
                        "price": 120,
                        "id": "fv8O__tYF"
                    }
                ],
                "count": 5,
                "required": false,
                "value": [],
                "title": "Eleccion de Bebida (Precio aparte)",
                "id": "CqRjCqLxD"
            }
        ],
        "originalPrice": 0,
        "price": 0,
        "title": "Merienda Box Dia del Padre 3 (Bebida Aparte)",
        "visibility": "hidden",
        "id": "BOaZvJgE4Z7Fbqo5zCbK",
        "subcategory": "Desayuno para uno"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1594210815/blondies/iymoxqummi2zl2hcm4a3.jpg",
        "featured": false,
        "description": "2 Danesas + Pepas de membrillo (125 Grs) + Galletitas de limón (125 Grs) + Alfajorcitos de maicena con Dulce de leche (125 Grs) + Bizcochitos de queso (125 Grs)\n",
        "category": "Bandejas",
        "options": [],
        "originalPrice": 0,
        "price": 500,
        "title": "Bandeja Matera para dos",
        "visibility": "available",
        "id": "BiVZnU09Qf2oeJCVkgxs",
        "available": true
    },
    {
        "description": "Tiras de pollo + Arroz Yamani + Verduras + Salsa de soja",
        "price": 340,
        "originalPrice": 0,
        "id": "CRuiaA47iI1RgyRowDYa",
        "subcategory": "Pollo",
        "category": "Woks",
        "featured": false,
        "options": [],
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335339/blondies/ii7iqqoe2wzyzvntd0ek.jpg",
        "title": "Wok de Pollo",
        "visibility": "available"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1589206314/blondies/yd6txpjqseavawozkoaz.jpg",
        "featured": false,
        "description": "Medialuna con Jamon y Queso + Mini Triffle + Cuadrado a elección + Cafe o Te en Hebras + Kit Cumpleaños",
        "category": "Cumpleanos",
        "options": [
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Cheesecake Clasico",
                        "id": "NgzvlfnMbz"
                    },
                    {
                        "id": "lcoUr0Yo6",
                        "price": 0,
                        "title": "Cheesecake Oreo"
                    },
                    {
                        "price": 0,
                        "id": "0sOn2xoUp",
                        "title": "Cheesecake Dulce de Leche"
                    },
                    {
                        "price": 0,
                        "title": "Cuadrado Ganache de Chocolate",
                        "id": "CYMB9V6RK"
                    },
                    {
                        "price": 0,
                        "id": "02QbC9kzc",
                        "title": "Cuadrado Carrot Cake"
                    },
                    {
                        "title": "Cuadrado Oreo",
                        "id": "pXvCOWl_L",
                        "price": 0
                    },
                    {
                        "title": "Brownie",
                        "id": "iRURXuLuP",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "title": "Blondies (Brownie Chocolate Blanco)",
                        "id": "T8BefXiiw"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion de Cuadrado Dulce",
                "id": "fMQngFtWf"
            },
            {
                "options": [
                    {
                        "id": "8_n3d6ZeMh",
                        "title": "Triffle Light (yoghurt descremado + frutas de estacion + granola casera)",
                        "price": 0
                    },
                    {
                        "id": "a7JL3mx5U",
                        "title": "Triffle Blondies (yoghurt + salsa de frutos rojos + granola casera)",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección de Mini Triffle",
                "id": "ilp1ssRpy"
            },
            {
                "options": [
                    {
                        "title": "Medialuna con jamón y queso",
                        "id": "B4Ym5_Ej7v",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "title": "Medialuna sin jamón y queso",
                        "id": "bGlRe5Ety"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion medialuna",
                "id": "c-FCZ75dV"
            }
        ],
        "originalPrice": 0,
        "price": 1100,
        "title": "Desayuno de Cumpleaños ",
        "visibility": "available",
        "id": "D7xC3nZXIWXP9N317fe4",
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590411588/blondies/ountlsu4yviuhjcqrxtz.jpg",
        "featured": false,
        "description": "Calabaza + Cebolla Caramelizada + Queso Parmesano + Mix de Verdes",
        "category": "Ensaladas",
        "options": [],
        "originalPrice": 0,
        "price": 250,
        "title": "Ensalada de Calabaza",
        "visibility": "available",
        "id": "DxsiKOwRqUoiHD7Wqeih",
        "available": true,
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1589548244/blondies/xyg4qy2mqlqufoqgqlop.jpg",
        "featured": true,
        "description": "Cuadrado Dulce a elección + Danesa con Jamon y Queso + Kit Aniversario",
        "category": "Cumpleanos",
        "options": [
            {
                "options": [
                    {
                        "price": 0,
                        "id": "zwOMVr7_Hz",
                        "title": "Cheesecake Clásico"
                    },
                    {
                        "id": "mf-6KDcNh",
                        "price": 0,
                        "title": "Cheesecake Oreo"
                    },
                    {
                        "id": "FMYSqc2km",
                        "title": "Cheesecake Dulce de Leche",
                        "price": 0
                    },
                    {
                        "id": "hzyA8NWFb",
                        "price": 0,
                        "title": "Cuadrado Ganache de Chocolate"
                    },
                    {
                        "id": "2UzZpO6ur",
                        "price": 0,
                        "title": "Cuadrado Carrot Cake"
                    },
                    {
                        "title": "Cuadrado Oreo",
                        "id": "pFCcK-BZr",
                        "price": 0
                    },
                    {
                        "id": "aGsSY-jDd",
                        "title": "Cuadrado Brownie",
                        "price": 0
                    },
                    {
                        "id": "qKyVIZEUb",
                        "title": "Cuadrado Blondies",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion de Cuadrado",
                "id": "GTDtJuniX"
            },
            {
                "options": [
                    {
                        "id": "EVqkUlPLH8",
                        "title": "Danesa CON Jamon y Queso",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "id": "ipuzzIm_1",
                        "title": "Danesa SIN Jamon y Queso"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección Danesa",
                "id": "67ZQ0BQYM"
            },
            {
                "options": [
                    {
                        "id": "29YwgRYMg_",
                        "price": 60,
                        "title": "Saquito de Cafe de especialidad"
                    },
                    {
                        "id": "76kxZieGry",
                        "price": 55,
                        "title": "Saquito de te en Hebras Negro"
                    },
                    {
                        "price": 55,
                        "title": "Saquito de te en Hebras Frutos Rojos",
                        "id": "UoHMCJrDw"
                    },
                    {
                        "id": "rM78rY9BD",
                        "title": "Saquito de Te en Hebras Verde",
                        "price": 55
                    }
                ],
                "count": 0,
                "required": false,
                "value": [],
                "title": "Agregar bebida (costo extra)",
                "id": "wJcd8VG6aO"
            }
        ],
        "originalPrice": 0,
        "price": 900,
        "title": "Kit Aniversario dulce y salado",
        "visibility": "available",
        "id": "EaSBWy8pK4yic1ZC1yLu",
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590410893/blondies/jd6licfjrowturmdaybx.jpg",
        "featured": true,
        "description": "Huevo de Campo Revuelto + Panceta + Queso en Bagel o Tostada de Campo + Frutas + Cafe con Leche o Jugo (NO incluye vajilla)",
        "category": "Desayunos y Meriendas",
        "options": [
            {
                "options": [
                    {
                        "title": "Cafe con Leche",
                        "id": "5k8_hn4qHj",
                        "price": 0
                    },
                    {
                        "title": "Cafe Americano",
                        "id": "Fds05UQvE",
                        "price": 0
                    },
                    {
                        "title": "Te en Hebras",
                        "price": 0,
                        "id": "l2v7mWMrK"
                    },
                    {
                        "id": "NBT2NFDFA",
                        "title": "Jugo de Naranja",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion de Bebidas",
                "id": "uVdVNpmgm"
            }
        ],
        "originalPrice": 0,
        "price": 425,
        "title": "Desayuno Americano",
        "visibility": "available",
        "id": "FNmFSA6JFfExAsTiJu8L",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1594211714/blondies/gfrs7thuvs5shftfjssn.jpg",
        "featured": false,
        "description": "Cuadrado Dulce a elección + Elección 2 danesas o croissants + Pepas de membrillo (125 grs) + galletitas de limón (125 grs)",
        "category": "Bandejas",
        "options": [
            {
                "options": [
                    {
                        "price": 0,
                        "id": "_e0CL7p7-f",
                        "title": "Cheesecake Clasico"
                    },
                    {
                        "id": "UF_rUxLYc9",
                        "title": "Cheesecake Dulce de Leche",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "title": "Cheesecake Oreo",
                        "id": "3hqBcMfXf"
                    },
                    {
                        "id": "DepDQ2QwA",
                        "title": "Cuadrado Ganache Chocolate",
                        "price": 0
                    },
                    {
                        "title": "Cuadrado Carrot Cake",
                        "id": "m7P7jpvvY",
                        "price": 0
                    },
                    {
                        "title": "Cuadrado Brownie",
                        "id": "0jPppB_Xq",
                        "price": 0
                    },
                    {
                        "id": "Q3D8WjnVo",
                        "price": 0,
                        "title": "Cuadrado Blondies"
                    },
                    {
                        "price": 0,
                        "id": "M0lq36LsS",
                        "title": "Cuadrado Oreo"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección Cuadrado Dulce",
                "id": "S-2OS8RZX"
            }
        ],
        "originalPrice": 0,
        "price": 550,
        "title": "Bandeja Blondies Chica",
        "visibility": "available",
        "id": "GfNfcnFTb0DRBCIeATX9"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334303/blondies/lxx2mi7ybk8vagiwsaik.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 85,
        "title": "Coca Cola Light 600 cc",
        "visibility": "available",
        "id": "H92G4doMNE5VN0xv8QXW",
        "available": true,
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1594213249/blondies/kqq6taxnjxzvt4zpnqrl.jpg",
        "featured": false,
        "description": "Elección 4 cuadrados Dulces + 4 Danesas o Croissants + Alfajores de Maicena con Dulce de leche (250 grs) + 4 Mini scone de queso + Pepas de membrillo (250 grs) + Galletitas de limón (250 Grs)",
        "category": "Bandejas",
        "options": [
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Cheesecake Clasico",
                        "id": "u-SKKuduYL"
                    },
                    {
                        "title": "Cheesecake Dulce de Leche",
                        "id": "QvLN2sFBje",
                        "price": 0
                    },
                    {
                        "id": "6dOqb9rS2",
                        "price": 0,
                        "title": "Cheesecake Oreo"
                    },
                    {
                        "price": 0,
                        "title": "Cuadrado Ganache de Chocolate",
                        "id": "qwBRyRCP1"
                    },
                    {
                        "price": 0,
                        "id": "T7U5EexaC",
                        "title": "Cuadrado Carrot Cake "
                    },
                    {
                        "id": "TR33akWjL",
                        "title": "Cuadrado Brownie",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "title": "Cuadrado Blondies",
                        "id": "uQp_Izb8C"
                    },
                    {
                        "price": 0,
                        "title": "Cuadrado Oreo",
                        "id": "O5ezAxXG0"
                    }
                ],
                "count": 4,
                "required": true,
                "value": [],
                "title": "Elección Cuadrados Dulces",
                "id": "Y9gDt-V93z"
            },
            {
                "options": [
                    {
                        "title": "Danesas",
                        "price": 0,
                        "id": "Ud8TdRUada"
                    },
                    {
                        "title": "Croissants",
                        "price": 0,
                        "id": "Tj5ckqZ7Ph"
                    }
                ],
                "count": 4,
                "required": true,
                "value": [],
                "title": "Eleccion Danesas o Croissants",
                "id": "gRYj2aNQk"
            }
        ],
        "originalPrice": 0,
        "price": 2100,
        "title": "Bandeja Blondies Large",
        "visibility": "available",
        "id": "HamJ1FDMpFRqjZpc28S1"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334401/blondies/wffolxmh04xlvrywhv47.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 180,
        "title": "Licuado de Banana",
        "visibility": "available",
        "id": "HwCVK3mH71k6WM2IU4HR",
        "subcategory": "Licuado",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590412487/blondies/micyzs4ijxqsgmuaxqm2.jpg",
        "featured": false,
        "description": "Pan casero + Carne + Huevo + Panceta + Queso Cheddar + Papas fritas",
        "category": "Hamburguesas",
        "options": [
            {
                "options": [
                    {
                        "id": "Y5BdpaoXpz",
                        "price": 0,
                        "title": "Papas fritas"
                    },
                    {
                        "id": "CQgycPqbz",
                        "title": "Ensalada de verdes",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Acompañamiento",
                "id": "GAb_ce3xS",
                "type": "single"
            },
            {
                "options": [
                    {
                        "title": "Mayonesa",
                        "id": "IyAHJ77ApS",
                        "price": 0
                    },
                    {
                        "id": "x_bsE9Ekx",
                        "price": 0,
                        "title": "Ketchup"
                    },
                    {
                        "id": "JOVANLUww",
                        "title": "Mostaza",
                        "price": 0
                    },
                    {
                        "id": "OOtM3ojdr",
                        "price": 0,
                        "title": "Salsa bbq"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Aderezos",
                "id": "io6aHONVY",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 350,
        "title": "Hamburguesa American (Incluye papas fritas)",
        "visibility": "available",
        "id": "J23Y3Nkmp3gGtKefpiyW",
        "subcategory": "Carne"
    },
    {
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "subcategory": "Brunch",
        "title": "Brunch para dos (NO Incluye vajilla)",
        "id": "Ja6HHWfo1Pg46oiFssdE",
        "featured": true,
        "visibility": "available",
        "description": "2 Cafe con Leche +  2 Jugos de Naranja + Bagel con huevos revueltos y panceta + Fiambre + Panes caseros + Waffles con dulce de leche + 2 Mini Triffles con Frutas de estacion",
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590410446/blondies/fbxixl5atcx4rulcu1q6.jpg",
        "price": 1200
    },
    {
        "originalPrice": 0,
        "id": "Jv0AKtTc3oeWZDhCEBmS",
        "description": "Tostado Jamon Crudo y Queso",
        "options": [],
        "price": 220,
        "visibility": "available",
        "title": "Sandwich Tostado de pan Arabe con Jamon Crudo y Queso ",
        "category": "Sandwiches",
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335310/blondies/qhwqrnppxu6bswqjprnn.jpg",
        "subcategory": "",
        "featured": false
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1591188495/blondies/rbtgkorx2lzwouartq9f.jpg",
        "featured": false,
        "description": "Mini cake + 4 mini Scone de queso o Dulce + 2 Mini Triffles",
        "category": "Dia del padre",
        "options": [
            {
                "options": [
                    {
                        "id": "BT1vBjpKGD",
                        "price": 0,
                        "title": "Mini Cake Ganache de Chocolate"
                    },
                    {
                        "price": 0,
                        "id": "Rvp4qwdII",
                        "title": "Mini Cake Carrot Cake "
                    },
                    {
                        "id": "czVUgNa0l",
                        "title": "Mini Cake Vainilla y Dulce de Leche",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion Mini Cake",
                "id": "VbVvrgc3r"
            },
            {
                "options": [
                    {
                        "id": "TAtbM2ntpv",
                        "title": "Cafe con Leche",
                        "price": 120
                    },
                    {
                        "price": 110,
                        "title": "Cafe Americano",
                        "id": "Zf0QPfrU2D"
                    },
                    {
                        "title": "Te saquito en Hebras Negro",
                        "id": "sn6aqDr1J",
                        "price": 120
                    },
                    {
                        "price": 120,
                        "id": "Wi8MNe5hX",
                        "title": "Te saquito en Hebras Frutos Rojos"
                    },
                    {
                        "price": 140,
                        "title": "Chocolatada Caliente",
                        "id": "oKLgk-vW1"
                    },
                    {
                        "title": "Submarino",
                        "id": "_rNHrggcE",
                        "price": 160
                    }
                ],
                "count": 4,
                "required": false,
                "value": [],
                "title": "Eleccion de Bebidas o Infusiones",
                "id": "JTvun547_"
            }
        ],
        "originalPrice": 0,
        "price": 0,
        "title": "Merienda Box Dia del Padre 2 (Bebida aparte)",
        "visibility": "hidden",
        "id": "KQlQ4dVbG2613leQ0A96",
        "subcategory": "Desayuno o Merienda Familiar"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335353/blondies/c5xgsjvp02lfzcjk2rok.jpg",
        "featured": false,
        "description": "Pollo + Queso Cheddar + Tomate + Guacamole",
        "category": "Wraps",
        "options": [],
        "originalPrice": 0,
        "price": 300,
        "title": "Wrap de Pollo (Incluye Papas fritas o ensalada de verdes)",
        "visibility": "available",
        "id": "LGIIJ0THIbMhubpcTj95",
        "subcategory": "Pollo",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590411033/blondies/l1uk3d0pdk6gp29uowqo.jpg",
        "featured": false,
        "description": "Eleccion de 2 cuadrados Dulces + 2 Mini Scones Salados",
        "category": "Desayunos y Meriendas",
        "options": [
            {
                "options": [
                    {
                        "title": "Cheesecake Clásico",
                        "id": "MNz1TscYJo",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "title": "Cheesecake Oreo",
                        "id": "gNn6ksEun"
                    },
                    {
                        "title": "Cheesecake Dulce de Leche",
                        "price": 0,
                        "id": "1Y2YsNs8L"
                    },
                    {
                        "price": 0,
                        "id": "5NMss1sZ-",
                        "title": "Brownie"
                    },
                    {
                        "title": "Blondies",
                        "price": 0,
                        "id": "pHKqeHiMG"
                    },
                    {
                        "id": "wzEo7JhlN",
                        "price": 0,
                        "title": "Cuadrado Ganache de Chocolate"
                    },
                    {
                        "price": 0,
                        "id": "dctgyLl0D",
                        "title": "Carrot Cake"
                    }
                ],
                "count": 2,
                "required": false,
                "value": [],
                "title": "Elección de Cuadrados dulces",
                "id": "e0mh_rsSm"
            }
        ],
        "originalPrice": 0,
        "price": 700,
        "title": "Pack Merienda para dos",
        "visibility": "available",
        "id": "LPIE6M1zp81l7JzZj74P",
        "available": true,
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590410650/blondies/ujvyhqprhg9fko9pnath.jpg",
        "featured": false,
        "description": "Cheesecake Oreo",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 240,
        "title": "Cuadrado Cheesecake Oreo",
        "visibility": "available",
        "id": "Ljeiv16syuT8ewQ4AYcq",
        "available": true,
        "subcategory": "Cuadrados Dulces"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1593902810/blondies/xqaf09j42nwcxrc7dvrm.jpg",
        "featured": false,
        "description": "Pack x 6 Cookies de Avena recién horneadas. 100% artesanales sin agregados.",
        "category": "Pasteleria",
        "options": [],
        "originalPrice": 0,
        "price": 300,
        "title": "Pack x 6 Cookies de Avena 100% artesanales",
        "visibility": "available",
        "id": "MenttfR7htmjhOiSlIzF",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590414138/blondies/x6krycoscksb1vibzjjv.jpg",
        "featured": false,
        "description": "Bagel + Huevo de Campo + Queso + Panceta ",
        "category": "Sandwiches",
        "options": [],
        "originalPrice": 0,
        "price": 300,
        "title": "Sandwich Bagel con Huevo (solo sandwich)",
        "visibility": "available",
        "id": "OJkcBoNr7KLoyym8c7Hz",
        "subcategory": "Huevo",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1589548143/blondies/ywycsrcupqkl37txo6jd.jpg",
        "featured": false,
        "description": "Desayuno Americano (Bagel Huevo Panceta Queso y frutas de estación) +2 Danesas + Cuadrado a eleccion + 2 Mini Triffles con granola casera + 2 Cafe con leche + Kit Cumpleaños",
        "category": "Cumpleanos",
        "options": [
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Cuadrado Cheesecake Clasico",
                        "id": "AX9t5uWr5"
                    },
                    {
                        "id": "98dCJBjkr",
                        "price": 0,
                        "title": "Cuadrado Cheesecake Dulce de Leche"
                    },
                    {
                        "price": 0,
                        "title": "Cuadrado Cheesecake Oreo",
                        "id": "5Xl-p2QeU"
                    },
                    {
                        "title": "Cuadrado Carrot Cake",
                        "price": 0,
                        "id": "HFDyHEcSh"
                    },
                    {
                        "price": 0,
                        "id": "CVYDA4Npi",
                        "title": "Cuadrado Torta Ganache"
                    },
                    {
                        "price": 0,
                        "title": "Cuadrado Brownie",
                        "id": "UzdNqMVXJ"
                    },
                    {
                        "title": "Cuadrado Blondies",
                        "price": 0,
                        "id": "eW_cYYJum"
                    },
                    {
                        "id": "3gM9G9Juz",
                        "title": "Cuadrado Oreo",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion de Cuadrado dulce",
                "id": "mDe1Ozhb2"
            }
        ],
        "originalPrice": 0,
        "price": 1550,
        "title": "Box Desayuno Cumpleaños para compartir",
        "visibility": "available",
        "id": "OXrxBF0fCLTX6ITTQyHh",
        "subcategory": "Desayuno"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334752/blondies/irfyqukygakbwllh8mqh.jpg",
        "featured": false,
        "description": "Cheesecake clasico + Salsa de frutos rojos",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 240,
        "title": "Cuadrado Cheesecake Clasico",
        "visibility": "available",
        "id": "OzM27zjhtYkXqCMiaO5S",
        "subcategory": "Cuadrados Dulces",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334878/blondies/hrvctb7ov4gdqjudden8.jpg",
        "featured": false,
        "description": "Cuadrado Dulce + Danesa con Jamon y Queso + Scone de Queso",
        "category": "Desayunos y Meriendas",
        "options": [
            {
                "options": [
                    {
                        "id": "2oWOxGuelA",
                        "title": "Cheesecake Clásico",
                        "price": 0
                    },
                    {
                        "id": "pYnO13u6J",
                        "price": 0,
                        "title": "Cheesecake Oreo"
                    },
                    {
                        "id": "XJy9BQPsE",
                        "price": 0,
                        "title": "Cheesecake Dulce de Leche"
                    },
                    {
                        "id": "4mkFNzdDk",
                        "title": "Cuadrado Ganache de Chocolate",
                        "price": 0
                    },
                    {
                        "id": "y8HfTlVdc",
                        "price": 0,
                        "title": "Carrot Cake "
                    },
                    {
                        "title": "Brownie",
                        "id": "TdvryvJg8",
                        "price": 0
                    },
                    {
                        "id": "nSw3FHnc5",
                        "title": "Blondies",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección Cuadrado Dulce",
                "id": "m4Qs_yzB0",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 625,
        "title": "Merienda Blondies",
        "visibility": "available",
        "id": "PNyUaNkH01rbZVIthMUj",
        "subcategory": "Merienda",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334409/blondies/k7xcxxwslzzob2cli1pb.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 200,
        "title": "Licuado de Frutilla",
        "visibility": "available",
        "id": "PPj0LxC3hFfTREZUKtVQ",
        "available": true,
        "subcategory": "Licuado"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334541/blondies/nsn69aoipltampkdu18s.jpg",
        "featured": false,
        "description": "Flat White",
        "category": "Cafeteria",
        "options": [],
        "originalPrice": 0,
        "price": 150,
        "title": "Flat White",
        "visibility": "available",
        "id": "QULHJmiFdsdO3xmNB7Xg",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1591187569/blondies/rojc0fyam4rizhdcksve.jpg",
        "featured": false,
        "description": "Elección de 4 Bebidas o Infusiones + 4 cuadrados Dulces + 6 medialunas + 4 Mini Triffles light + 4 Mini Scone de Queso + Tarjeta dia del Padre y stickers. ",
        "category": "Dia del padre",
        "options": [
            {
                "options": [
                    {
                        "id": "G3eGJkM3UC",
                        "price": 0,
                        "title": "Cheesecake Clasico"
                    },
                    {
                        "price": 0,
                        "title": "Cheesecake Dulce de Leche",
                        "id": "4dy-_JGAj8"
                    },
                    {
                        "id": "xlfWZkbJK",
                        "price": 0,
                        "title": "Cheesecake Oreo"
                    },
                    {
                        "id": "72wtPiNet",
                        "price": 0,
                        "title": "Cuadrado Ganache de Chocolate "
                    },
                    {
                        "price": 0,
                        "title": "Cuadrado Carrot Cake",
                        "id": "mNl8ZpFrc"
                    },
                    {
                        "title": "Cuadrado Blondies",
                        "price": 0,
                        "id": "jVXZ-ztzL"
                    },
                    {
                        "price": 0,
                        "id": "BF4VEgYV7",
                        "title": "Cuadrado Brownie"
                    }
                ],
                "count": 4,
                "required": false,
                "value": [],
                "title": "Eleccion de Cuadrado Dulce",
                "id": "JZWjtwya0"
            },
            {
                "options": [
                    {
                        "id": "l7KwVy7_Qy",
                        "price": 0,
                        "title": "Cafe con Leche"
                    },
                    {
                        "title": "Cafe Americano",
                        "id": "4PkE7xCS2L",
                        "price": 0
                    },
                    {
                        "title": "Chocolatada Caliente",
                        "id": "mIo4avnEy",
                        "price": 0
                    },
                    {
                        "id": "dkCMAhAbU",
                        "price": 0,
                        "title": "Submarino"
                    },
                    {
                        "id": "toZidNt3N",
                        "price": 0,
                        "title": "Jugo de Naranja"
                    },
                    {
                        "price": 0,
                        "id": "4mCD7rWCA",
                        "title": "Te saquito en Hebras Negro"
                    },
                    {
                        "id": "TO_F0yAe9",
                        "price": 0,
                        "title": "Te saquito en Hebras Verde"
                    },
                    {
                        "title": "Te saquito en Hebras Frutos Rojos",
                        "price": 0,
                        "id": "XWPlEHJea"
                    }
                ],
                "count": 4,
                "required": false,
                "value": [],
                "title": "Eleccion de Bebidas o Infusiones",
                "id": "5fvASwp6m"
            }
        ],
        "originalPrice": 0,
        "price": 0,
        "title": "Merienda Box Dia del Padre Familiar Completo (Incluye Bebida)",
        "visibility": "hidden",
        "id": "Qo7xJfu6eCvx4knj5Sx1",
        "subcategory": "Desayuno Familiar"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590413684/blondies/l5weww5uhdabuf7avoot.jpg",
        "featured": false,
        "description": "Torta Ganache",
        "category": "Pasteleria",
        "options": [],
        "originalPrice": 0,
        "price": 2500,
        "title": "Torta Ganache de Chocolate entera",
        "visibility": "available",
        "id": "RsfVk818nMYFs1WvBnjM",
        "subcategory": "Tortas enteras",
        "available": true
    },
    {
        "options": [],
        "category": "Dia del Maestro",
        "price": 1200,
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1598010649/blondies/lyustkddgl046kqzxmgf.jpg",
        "featured": true,
        "title": "Desayuno o Merienda Dia del Maestro Grande",
        "originalPrice": 0,
        "visibility": "available",
        "description": "Bebidas: \n* Te en Hebras Saquito Indra o Café de Especialidad en Saquito Puerto Blest. \n* Jugo de Naranja exprimido en Botella 250 cc.\n* Botella Agua Mineral 500 cc. \n\nComestible\n* Mini pan artesanal 500 gramos (Semillas, Lactal, Salvado o Campo) con mermeladas y queso crema \n* 2 Danesas\n* 2 Scones de Parmesano \n* Galletitas dulces Artesanales variadas 250 Gramos (Pepas, Limón, Alfajores de maicena) \n* Packaging y tarjeta con mensaje incluido\n",
        "id": "SJrwsFLMKyp1lbeSUOjy"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1589481546/blondies/nzeli3cmcy7pb8012gla.jpg",
        "featured": false,
        "description": "Hamburguesa con queso o Chicken Fingers + Papas Fritas + Bebida + Juguete COVID 19",
        "category": "Hamburguesas",
        "options": [
            {
                "options": [
                    {
                        "title": "Hamburguesa con Queso",
                        "id": "MuUN_85mpu",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "id": "pQ9_xUORG",
                        "title": "Chicken Fingers"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion plato",
                "id": "rx5N6khCd"
            },
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Coca Cola",
                        "id": "sHmuZAC9b2"
                    },
                    {
                        "id": "UWkTqPYke",
                        "price": 0,
                        "title": "Coca Cola Zero"
                    },
                    {
                        "title": "Fanta",
                        "price": 0,
                        "id": "KOHCVj-4-"
                    },
                    {
                        "price": 0,
                        "title": "Sprite",
                        "id": "kjo2zYe-O"
                    },
                    {
                        "id": "lowygRg30",
                        "title": "Agua con gas",
                        "price": 0
                    },
                    {
                        "id": "uegPXsyDi",
                        "price": 0,
                        "title": "Agua sin gas"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Seleccion de Bebida",
                "id": "AqIq_ukqp"
            }
        ],
        "originalPrice": 0,
        "price": 450,
        "title": "Cajita Blondies + Juguete COVID19  ",
        "visibility": "hidden",
        "id": "TCDDf5YnHYdFp8XyAvSY",
        "subcategory": "Carne"
    },
    {
        "category": "Desayunos y Meriendas",
        "visibility": "available",
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1591193053/blondies/eotegwmsysvfay3adpzx.jpg",
        "description": "Danesa ",
        "title": "Danesa por unidad",
        "options": [],
        "originalPrice": 0,
        "featured": false,
        "price": 50,
        "id": "TZ3oMG9aXlIF38Xjap1v"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334785/blondies/a3rojwjglmgvejmmyslg.jpg",
        "featured": false,
        "description": "Torta de Chocolate + Ganache de Chocolate ",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 260,
        "title": "Cuadrado Ganache de Chocolate",
        "visibility": "available",
        "id": "TguOwbDcLFOoGw82VvRc",
        "available": true,
        "subcategory": "Cuadrados Dulces"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335287/blondies/bevg0vdehafkcf4hrxaa.jpg",
        "featured": false,
        "description": "Croissant con Jamon y Queso",
        "category": "Sandwiches",
        "options": [],
        "originalPrice": 0,
        "price": 185,
        "title": "Sandwich Croissant con Jamon y Queso",
        "visibility": "available",
        "id": "TlRUvqKszuGrqCXISglM",
        "subcategory": "Croissant",
        "available": true
    },
    {
        "featured": false,
        "visibility": "hidden",
        "description": "Kit decora tus Galletitas con Glace y Granas (6 Galletitas) + 2 Cuadrado Brownie con Mini Confites de Chocolate+ 2 Danesas + 4 Scone Parmesano + 6 Cookies con Chispas de Chocolate + 2 Chocolatadas 200 CC + 2 Te en Hebras o Cafe de Especialidad en Saquito.",
        "price": 1900,
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1597084693/blondies/vp2amtxgaqidyuryefmy.jpg",
        "category": "Dia del Niño",
        "title": "Bandeja Dia del Niño Grande",
        "originalPrice": 0,
        "options": [],
        "id": "TriyCNMeWeBstIQRilmt"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590414332/blondies/bjuqelik3k1huphh4kep.jpg",
        "featured": false,
        "description": "Pollo + Vegetales ",
        "category": "Wraps",
        "options": [],
        "originalPrice": 0,
        "price": 300,
        "title": "Wrap de Pollo y Vegetales (Incluye Papas fritas o ensalada de verdes)",
        "visibility": "available",
        "id": "UUaMJORv7UdHFWs0E8M3",
        "available": true,
        "subcategory": "Pollo"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335030/blondies/z00iwstulz6asz6mwoup.jpg",
        "featured": false,
        "description": "Cherry Confitado + Muzzarella fresca  + Mix de Verdes",
        "category": "Ensaladas",
        "options": [],
        "originalPrice": 0,
        "price": 280,
        "title": "Ensalada Capresse",
        "visibility": "available",
        "id": "UrpnhjUG1o4oK5sLUGRj",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1598872492/blondies/p3cmyi5iid5u6qyilpdm.jpg",
        "featured": false,
        "description": "Bebidas:\n\n* Te en Hebras Saquito Indra o Cafe de Especialidad en Saquito Puerto Blest. \n* Jugo de Naranja exprimido en Botella 250 cc.\n* Botella Agua Mineral 500 cc.\n\nComestible:\n \n* Cuadrado dulce a elección.\n* Mini pan de campo para tostadas con mermeladas y queso crema\n* 1 Croissant de almendras\n* 2 Danesas\n* 2 Scones de Parmesano",
        "category": "Bandejas para Empresas",
        "options": [
            {
                "options": [
                    {
                        "title": "Cheesecake Clasico",
                        "price": 0,
                        "id": "EcxOgIolHH"
                    },
                    {
                        "price": 0,
                        "id": "NAio8Gd2lf",
                        "title": "Cheesecake Oreo"
                    },
                    {
                        "price": 0,
                        "title": "Cheesecake Dulce de Leche",
                        "id": "we_saK7MJ"
                    },
                    {
                        "id": "5S3Lp8Fys",
                        "price": 0,
                        "title": "Cuadrado Ganache de Chocolate"
                    },
                    {
                        "title": "Cuadrado Oreo",
                        "id": "rZOFC4hOY",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "title": "Cuadrado Brownie",
                        "id": "kl00chkVB"
                    },
                    {
                        "id": "hD3fPNGVY",
                        "title": "Cuadrado Blondies",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "id": "Pxlo1YhMv",
                        "title": "Cuadrado Carrot Cake"
                    }
                ],
                "count": 1,
                "required": true,
                "value": [],
                "title": "Eleccion de Cuadrado",
                "id": "3RqIkDyJV"
            },
            {
                "options": [
                    {
                        "title": "Te negro en Hebras Saquito",
                        "price": 0,
                        "id": "kseq3l6YzO"
                    },
                    {
                        "price": 0,
                        "title": "Te verde en Hebras Saquito",
                        "id": "38XSDPsBTo"
                    },
                    {
                        "title": "Te Frutos Rojos Saquito",
                        "id": "SJ3T3vwku",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "id": "mZC6gKpMC",
                        "title": "Cafe de Especialidad Saquito"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección Infusion",
                "id": "O-nv_kIaPw"
            }
        ],
        "originalPrice": 0,
        "price": 1200,
        "title": "Bandeja para Regalo Empresa 1 (Solicitar 48horas antes)",
        "visibility": "available",
        "id": "UthmhHof7ZiLVxJApBqj"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334371/blondies/yalp2wghxuzjvtdydehv.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 85,
        "title": "Fanta 600 cc",
        "visibility": "available",
        "id": "WJ4p5tyKUKPn1nA8XJG5",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590411190/blondies/uwpjdrpmuwhjjjymfd6d.jpg",
        "featured": false,
        "description": "Granola Casera + Yoghurt+ Salsa de Frutos Rojos",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 200,
        "title": "Triffle Blondies",
        "visibility": "available",
        "id": "WjMHBG8t0YMjHQenBW13",
        "subcategory": "Triffle",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590413006/blondies/cxedn9iwfmvozwbvafu9.jpg",
        "featured": false,
        "description": "Pan casero + Carne + Jamon + Queso + Huevo + Lechuga + Tomate + Papas fritas",
        "category": "Hamburguesas",
        "options": [
            {
                "options": [
                    {
                        "title": "Papas fritas",
                        "id": "yYeMfQtwwb",
                        "price": 0
                    },
                    {
                        "id": "keCEzuQKM",
                        "title": "Ensalada de verdes",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Acompañamiento",
                "id": "16A9QSNKu",
                "type": "single"
            },
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Mayonesa",
                        "id": "clYiZowQqC"
                    },
                    {
                        "id": "HYKf2lXgF",
                        "price": 0,
                        "title": "Ketchup"
                    },
                    {
                        "id": "ToS6CD4bW",
                        "price": 0,
                        "title": "Mostaza"
                    },
                    {
                        "price": 0,
                        "title": "Salsa bbq",
                        "id": "5JVd8aYiY"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Aderezos",
                "id": "o_MI_4Vja",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 350,
        "title": "Hamburguesa Blondies (Incluye papas fritas)",
        "visibility": "available",
        "id": "Wy0gEUsgI7u6mKVUxmOm",
        "subcategory": "Carne"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1597084617/blondies/t3wt2hlmvfr5zkznvsok.jpg",
        "options": [],
        "title": "Bandeja Dia del Niño Chica",
        "featured": false,
        "originalPrice": 0,
        "category": "Dia del Niño",
        "visibility": "hidden",
        "description": "Kit decora tus Galletitas con Glace y Granas (3 Galletitas) + 1 Cuadrado Brownie con Mini Confites de Chocolate + 4 Cookies con Chispas de Chocolate +1 Danesa +  1 Chocolatada 200 CC ",
        "price": 850,
        "id": "X2BcHPmBc2Obo2caHfIp"
    },
    {
        "price": 200,
        "title": "Desayuno Clasico",
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590413985/blondies/akalvdf9tstia1jx7azv.jpg",
        "featured": false,
        "category": "Promociones",
        "id": "X6GxLtIpPJc67uRKEjgn",
        "options": [],
        "description": "Cafe o te + tostadas caseras",
        "visibility": "available",
        "originalPrice": 240,
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1598873424/blondies/rdizclgwrsuw8vtvq8g9.jpg",
        "featured": false,
        "description": "Bebidas:\n* Te en Hebras Saquito Indra o Cafe de Especialidad en Saquito Puerto Blest. \n* Jugo de Naranja exprimido en Botella 250 cc.\n* Botella Agua Mineral 500 cc.\n\nComestible: \n* 2 Danesas\n* Muffin a Eleccion\n* 2 Scone Queso Parmesano\n* Triffle de Yoghurt + Granola Artesanal + Salsa de Frutos Rojos\n* Cuadrado dulce a elección",
        "category": "Bandejas para Empresas",
        "options": [
            {
                "options": [
                    {
                        "id": "k5QJuqB9P4",
                        "price": 0,
                        "title": "Te Negro en Hebras Saquito"
                    },
                    {
                        "price": 0,
                        "id": "qpIczHR2ak",
                        "title": "Te Verde en Hebras Saquito"
                    },
                    {
                        "title": "Te Frutos Rojos en Hebras Saquito",
                        "id": "_Ahwxc5II",
                        "price": 0
                    },
                    {
                        "title": "Cafe de Especialidad Saquito",
                        "price": 0,
                        "id": "jq5iP7psj"
                    }
                ],
                "count": 1,
                "required": true,
                "value": [],
                "title": "Elección Infusion",
                "id": "6IGOBHj9b"
            },
            {
                "options": [
                    {
                        "title": "Muffin de Banana",
                        "id": "osFTXypW19",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "title": "Muffin de Frutos Rojos",
                        "id": "sbIvgyCaOv"
                    },
                    {
                        "price": 0,
                        "title": "Muffin de Chocolate",
                        "id": "XYMquGqvU2"
                    }
                ],
                "count": 1,
                "required": true,
                "value": [],
                "title": "Eleccion Muffin",
                "id": "nf6X4ufZr"
            },
            {
                "options": [
                    {
                        "id": "X1iJ1UO_Pl",
                        "price": 0,
                        "title": "Cheesecake Clasico"
                    },
                    {
                        "price": 0,
                        "title": "Cheesecake Oreo",
                        "id": "V0cpg3WgZ8"
                    },
                    {
                        "price": 0,
                        "id": "Xr5S57CPd",
                        "title": "Cheesecake Dulce de Leche"
                    },
                    {
                        "id": "RHyU9Gfrq",
                        "title": "Ganache de Chocolate",
                        "price": 0
                    },
                    {
                        "title": "Carrot Cake",
                        "id": "ywroamq5a",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "id": "lRqfDlmX7",
                        "title": "Cuadrado Oreo"
                    },
                    {
                        "id": "0v0VJNKtp",
                        "price": 0,
                        "title": "Brownie"
                    },
                    {
                        "id": "VeozXyCuwt",
                        "price": 0,
                        "title": "Blondies"
                    }
                ],
                "count": 1,
                "required": true,
                "value": [],
                "title": "Eleccion de Cuadrado Dulce",
                "id": "BPUdyBIs2"
            }
        ],
        "originalPrice": 0,
        "price": 1200,
        "title": "Bandeja para Regalo Empresa 3 (Solicitar 48horas antes)",
        "visibility": "available",
        "id": "XCESehusd31POhIEwKbS"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1596288677/blondies/csn7arxnnazyacokgs6q.jpg",
        "featured": true,
        "description": "Pan Casero + Carne + Lechuga + Tomate + Queso ",
        "category": "Hamburguesas",
        "options": [
            {
                "options": [
                    {
                        "id": "phOSsCDQKx",
                        "price": 0,
                        "title": "Papas Fritas"
                    },
                    {
                        "price": 0,
                        "id": "-Ha0_g9nA",
                        "title": "Ensalada de Verdes"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Acompañamiento",
                "id": "ObZb5wxjG",
                "type": "single"
            },
            {
                "options": [
                    {
                        "price": 0,
                        "id": "i5QbOwQvk0",
                        "title": "Mayonesa"
                    },
                    {
                        "id": "O9A9tEhF9",
                        "title": "Ketchup",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "title": "Mostaza",
                        "id": "OhSD2H_H4"
                    },
                    {
                        "price": 0,
                        "title": "Salsa bbq",
                        "id": "qemnwwXoD"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Aderezos",
                "id": "zng0YOqCL",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 265,
        "title": "Hamburguesa Clásica ",
        "visibility": "available",
        "id": "XPEoCPcL7Vk6EBOJdmyf",
        "subcategory": "Carne"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1594211345/blondies/wauw5j4qeor2o1vfbhoh.jpg",
        "featured": false,
        "description": "Eleccion 4 Danesas o 4  Croissants+ Pepas de membrillo (250 grs) + Galletitas de limón (250 grs) + Alfajorcitos de maicena con Dulce de leche (250 grs) + Bizcochitos de queso (250 grs)",
        "category": "Bandejas",
        "options": [
            {
                "count": 4,
                "required": true,
                "value": [],
                "title": "Elección Danesas o Croissants",
                "options": [
                    {
                        "title": "Danesas",
                        "id": "0q0JwYcGUC",
                        "price": 0
                    },
                    {
                        "title": "Croissants",
                        "id": "aTqb8eqpI1",
                        "price": 0
                    }
                ],
                "id": "3TuHcXxyI"
            }
        ],
        "originalPrice": 0,
        "price": 1000,
        "title": "Bandeja Matera para cuatro",
        "visibility": "available",
        "id": "Xuc6J6bcfHqmGoYMmjaG",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590413660/blondies/kszjejkda3upavfba4j2.jpg",
        "featured": false,
        "description": "Torta Alfajor (8 porciones)",
        "category": "Pasteleria",
        "options": [],
        "originalPrice": 0,
        "price": 2600,
        "title": "Torta Alfajor Entera",
        "visibility": "available",
        "id": "YZxOejym6XeXRL4aQnu6",
        "available": true,
        "subcategory": "Tortas enteras"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590414305/blondies/dvvk6pngpezjcgzu1hrw.jpg",
        "featured": false,
        "description": "Carne + Queso + Tomate + Guacamole",
        "category": "Wraps",
        "options": [],
        "originalPrice": 0,
        "price": 320,
        "title": "Wrap de Carne (Incluye Papas fritas o ensalada de verdes)",
        "visibility": "available",
        "id": "ZDAXJBmxuqa5VNwlm8JQ",
        "subcategory": "Carne",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334846/blondies/we0c1gtcqxbnfgssmach.jpg",
        "featured": false,
        "description": "2 Danesas + 2 Mini triffles + Canasta de panes + 2 Cafe con leche o Te en Hebras. (NO Incluye tazas ni tetera)",
        "category": "Desayunos y Meriendas",
        "options": [
            {
                "options": [
                    {
                        "id": "5gktQCperx",
                        "price": 0,
                        "title": "Cafe con Leche"
                    },
                    {
                        "id": "mJ1Nm1NYD",
                        "title": "Cafe Americano",
                        "price": 0
                    },
                    {
                        "id": "Bu9tCAph2",
                        "title": "Te en Hebras",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "title": "Jugo de Naranja",
                        "id": "t3Q34yXcP"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Bebidas",
                "id": "3gDKZDCyf"
            },
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Triffle Light (Yoghurt Light + Frutas de estación)",
                        "id": "mZOJg75d33"
                    },
                    {
                        "title": "Triffle Clásico (Salsa de Arandanos)",
                        "price": 0,
                        "id": "dMT50FLjT"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion Triffle",
                "id": "wdGIjLw88"
            }
        ],
        "originalPrice": 0,
        "price": 730,
        "title": "Desayuno para dos personas",
        "visibility": "available",
        "id": "ZfOlKa5RrxgB9mFtuSf9",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590410300/blondies/hp7i3txvs2ow5b8dsevw.jpg",
        "featured": false,
        "description": "Plato a eleccion + Bebida + Postre o Cafe",
        "category": "Combo del dia",
        "options": [
            {
                "options": [
                    {
                        "title": "Wok de Pollo",
                        "id": "FMhCydjv6t",
                        "price": 0
                    },
                    {
                        "title": "Wok de Carne",
                        "price": 0,
                        "id": "JSdInjetN"
                    },
                    {
                        "title": "Wok Vegetariano",
                        "price": 0,
                        "id": "0C0yql_hg"
                    },
                    {
                        "id": "4bNo6oYIl",
                        "title": "Ensalada Blondies",
                        "price": 0
                    },
                    {
                        "id": "kHXb7T2kD",
                        "price": 0,
                        "title": "Ensalada Caesar"
                    },
                    {
                        "price": 0,
                        "id": "tdJCFCX8x",
                        "title": "Ensalada de Calabaza"
                    },
                    {
                        "id": "6IlbL7WEu",
                        "price": 0,
                        "title": "Hamburguesa Clasica con Papas Fritas"
                    },
                    {
                        "price": 0,
                        "id": "azJlfuBDv",
                        "title": "Hamburguesa Pollo Crispy con Papas Fritas"
                    },
                    {
                        "id": "7UyJZxS5p",
                        "title": "Chicken Fingers con Papas Fritas",
                        "price": 0
                    },
                    {
                        "id": "42ga-2v0K",
                        "price": 0,
                        "title": "Wrap de Pollo"
                    },
                    {
                        "price": 0,
                        "title": "Wrap de Carne",
                        "id": "yxZRqcMqC"
                    },
                    {
                        "price": 0,
                        "title": "Wrap Vegetariano",
                        "id": "Jg6B48bFP"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion de plato",
                "id": "_aAVMyWrn",
                "type": "single"
            },
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Agua",
                        "id": "ksMAJ_iLQO"
                    },
                    {
                        "title": "Agua con gas",
                        "id": "ai4ea6C5s",
                        "price": 0
                    },
                    {
                        "id": "xM4B1eG4Y",
                        "price": 0,
                        "title": "Coca Cola"
                    },
                    {
                        "title": "Coca Cola Zero",
                        "price": 0,
                        "id": "PfMYjUd1O"
                    },
                    {
                        "id": "JNqewPKo0",
                        "title": "Coca Cola Light",
                        "price": 0
                    },
                    {
                        "title": "Sprite",
                        "id": "uM3ZO9wvy",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Bebida",
                "id": "NBkLf4qwK",
                "type": "single"
            },
            {
                "options": [
                    {
                        "title": "Postre del dia",
                        "id": "FJmYiQK3Gd",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección de Postre",
                "id": "cll8IprqY",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 360,
        "title": "Combo del dia (Lunes a Viernes)",
        "visibility": "available",
        "id": "ZlTxV5ielmCCeO7tuS7P",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590413470/blondies/huq1mmeov5qkrivwbknd.jpg",
        "featured": false,
        "description": "Chocolate",
        "category": "Pasteleria",
        "options": [],
        "originalPrice": 0,
        "price": 185,
        "title": "Muffin de Doble Chocolate",
        "visibility": "available",
        "id": "a7gAhkmINDvBF89ujHVK",
        "subcategory": "Muffins",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334554/blondies/oq5tgg04jwealcdac2gt.jpg",
        "featured": false,
        "description": "",
        "category": "Cafeteria",
        "options": [
            {
                "options": [
                    {
                        "title": "Clasico",
                        "price": 0,
                        "id": "FkOfa21mOv"
                    },
                    {
                        "price": 0,
                        "id": "soEh-NTVo",
                        "title": "Chocolate "
                    },
                    {
                        "price": 0,
                        "id": "gK0q6BhTC",
                        "title": "Vainilla"
                    },
                    {
                        "price": 0,
                        "id": "lk-hRP08b",
                        "title": "Dulce de Leche"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion de Frapuccino",
                "id": "MpdyJm0Ka",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 220,
        "title": "Frapuccino",
        "visibility": "available",
        "id": "cgNouKxTuxNZN7YQJuPz",
        "subcategory": "Frapuccino",
        "available": true
    },
    {
        "subcategory": "",
        "description": "Cafe o te  + 2 danesas",
        "category": "Promociones",
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335251/blondies/iorphnjx4wum6z1yhmsp.jpg",
        "visibility": "available",
        "featured": false,
        "price": 200,
        "options": [],
        "title": "Cafe + 2 Danesas",
        "originalPrice": 220,
        "id": "cq5hTq9g0EwftD0ob1vE"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1589548195/blondies/mcrhjm9ecdlhj2jmtjlc.jpg",
        "category": "Cumpleanos",
        "price": 300,
        "originalPrice": 0,
        "title": "Kit Cumpleaños o Aniversario (sin cuadrado dulce)",
        "id": "dBGPQQhx8SwtkDA68xkG",
        "description": "Agrega 1 Globo + 1 tarjeta para dejar tu mensaje + 1 Vela Blondies + Caja de presentacion",
        "options": [],
        "subcategory": "",
        "featured": false,
        "visibility": "available"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334949/blondies/s49yw7fkcmlt1tafcqps.jpg",
        "featured": true,
        "description": "Salsa Dulce de Leche + Frutas",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 300,
        "title": "Waffles con Dulce de Leche",
        "visibility": "available",
        "id": "dHsYRmrhjB22KNUgdm73",
        "available": true,
        "subcategory": "Waffles"
    },
    {
        "visibility": "available",
        "subcategory": "Medialunas",
        "title": "Media docena de Medialunas de Manteca (GRANDES)",
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334857/blondies/q60elncq2nuoeehz9urp.jpg",
        "featured": false,
        "price": 270,
        "category": "Desayunos y Meriendas",
        "description": "Famosas Danesas de Manteca de Blondies",
        "originalPrice": 0,
        "options": [],
        "id": "ddHpuNHvJPP990bpHUs3"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335302/blondies/gojyfhhfanprcregyr8w.jpg",
        "featured": false,
        "description": "Tostado de Jamon y Queso",
        "category": "Sandwiches",
        "options": [],
        "originalPrice": 0,
        "price": 195,
        "title": "Sandwich Tostado de pan Arabe con Jamon cocido y Queso",
        "visibility": "available",
        "id": "eNLf4GhnDfZea9hoxffs",
        "available": true,
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334390/blondies/wap0eonzqmxgapcwn7qx.jpg",
        "featured": false,
        "description": "Exprimido de Naranja",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 160,
        "title": "Jugo de Naranja ",
        "visibility": "available",
        "id": "fTsi9lM9IL6JKEtSz7Vi",
        "available": true,
        "subcategory": "Jugos"
    },
    {
        "featured": false,
        "id": "fj05YZ04VulGX48Vo99z",
        "title": "Cafe o Te + Danesa con Jamon y Queso",
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335266/blondies/vrkcxu6ecu9cb9kj9vt4.jpg",
        "subcategory": "",
        "description": "Cafe o Te + Danesa con Jamon y Queso",
        "originalPrice": 280,
        "category": "Promociones",
        "price": 230,
        "visibility": "available",
        "options": []
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335210/blondies/uzt8f4eytngpouwdsmdh.jpg",
        "featured": false,
        "description": "Frutos Rojos",
        "category": "Pasteleria",
        "options": [],
        "originalPrice": 0,
        "price": 180,
        "title": "Muffin de Frutos Rojos",
        "visibility": "available",
        "id": "gZAinqaceZcbLdj8Y0NR",
        "subcategory": "Muffins",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590410626/blondies/gki9oxyrub4gem30o7yw.jpg",
        "featured": false,
        "description": "Porcion Budin Marmolado",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 170,
        "title": "Budin Marmolado",
        "visibility": "available",
        "id": "gxdAww48FG4uBF323nbS",
        "available": true,
        "subcategory": "Budines"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334935/blondies/fq5ivkafbua8rtf3ceqt.jpg",
        "featured": false,
        "description": "Crema de Mani+Salsa de Chocolate+Bonobon",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 330,
        "title": "Waffles Bonobon",
        "visibility": "available",
        "id": "hAKi2TaRvG7bjxy5WWky",
        "available": true,
        "subcategory": "Waffles"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334422/blondies/eshdxh5fwojbk2fvxdtf.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 185,
        "title": "Limonada de Frutos Rojos",
        "visibility": "available",
        "id": "iPUpOM0WbCm6VsRyIK2m",
        "available": true,
        "subcategory": "Limonadas"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1589548467/blondies/jschja83ihe3o2dorwq2.jpg",
        "featured": false,
        "description": "Waffles a eleccion + Cuadrado Dulce a Eleccion + 2 Medialunas con Jamon y queso o 2 Scones de Queso +2 Cafe con Leche + Kit Cumpleaños",
        "category": "Cumpleanos",
        "options": [
            {
                "options": [
                    {
                        "title": "Cuadrado Cheesecake Clasico",
                        "price": 0,
                        "id": "8CfMR54MDT"
                    },
                    {
                        "title": "Cuadrado Cheesecake Oreo",
                        "id": "cfKsLraBV",
                        "price": 0
                    },
                    {
                        "id": "6i04L8hNL",
                        "price": 0,
                        "title": "Cuadrado Cheesecake Dulce de Leche"
                    },
                    {
                        "id": "SNnuOeh30",
                        "price": 0,
                        "title": "Cuadrado Carrot Cake"
                    },
                    {
                        "id": "vucn2vuCO",
                        "price": 0,
                        "title": "Cuadrado Torta Ganache de Chocolate"
                    },
                    {
                        "id": "599U-qisq",
                        "price": 0,
                        "title": "Cuadrado Brownie"
                    },
                    {
                        "id": "8IwCG1QEF",
                        "title": "Cuadrado Blondies",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección Cuadrado Dulce",
                "id": "vX0gK8CNF"
            },
            {
                "options": [
                    {
                        "id": "3QXsBD2R1V",
                        "price": 0,
                        "title": "2 Scones de Queso"
                    },
                    {
                        "price": 0,
                        "id": "jK6q-SIhU",
                        "title": "2 Medialunas de Jamon y Queso"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion Medialuna o Scone de Queso",
                "id": "7vCaKIqk3"
            },
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Waffles Oreo ",
                        "id": "N4DZAy_4xd"
                    },
                    {
                        "price": 0,
                        "title": "Waffles Clasicos con Dulce de leche",
                        "id": "AIThsvLwm"
                    },
                    {
                        "id": "KOtE5C4ws",
                        "price": 0,
                        "title": "Waffle Nutella"
                    },
                    {
                        "price": 0,
                        "id": "WI3vGfCh7",
                        "title": "Waffle Bonobon"
                    },
                    {
                        "id": "M-aVTMqP_",
                        "title": "Waffle Vegano",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección Waffles",
                "id": "MVR-Awm-E"
            }
        ],
        "originalPrice": 0,
        "price": 1500,
        "title": "Box Merienda Cumpleaños par Compartir",
        "visibility": "available",
        "id": "iPadxkxNJXyTU6wKqlNl",
        "subcategory": "Merienda"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590410602/blondies/eu4kzoesd5tfgsbc2uoz.jpg",
        "featured": false,
        "description": "Porcion Budin de Limon",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 160,
        "title": "Budin de Limon",
        "visibility": "available",
        "id": "jeKGtGyFZ4Mu7XK28F1N",
        "available": true,
        "subcategory": "Budines"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334471/blondies/tha5uaqxvqckjtzn5zm0.jpg",
        "featured": false,
        "description": "Cafe 100% Arabica Blend Blondies",
        "category": "Cafeteria",
        "options": [],
        "originalPrice": 0,
        "price": 120,
        "title": "Cafe Americano Cortado",
        "visibility": "available",
        "id": "jgambphvNndfy0gZcL0r",
        "available": true,
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334602/blondies/rptyfkey37uw8vdvmiff.jpg",
        "originalPrice": 0,
        "title": "Mini Cake de Ganache de Chocolate (un dia antes de anticipación)",
        "subcategory": "Minicakes",
        "price": 950,
        "visibility": "available",
        "options": [],
        "description": "Ganache de Chocolate (Equivale 2 porciones de torta Aprox)",
        "featured": true,
        "category": "Cumpleanos",
        "id": "jgq5smMGOldfAt4GXFdL"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590413128/blondies/u8ylhn8dzutgeswwn4ip.jpg",
        "featured": false,
        "description": "Pollo + Palta + Tomates Cherry + Mix de Verdes ",
        "category": "Ensaladas",
        "options": [],
        "originalPrice": 0,
        "price": 260,
        "title": "Ensalada Blondies",
        "visibility": "available",
        "id": "k5sS3ObhytJIITjlq5tv",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1591186128/blondies/arhf2ylpmwsipfttuzgx.jpg",
        "featured": false,
        "description": "Bagel con huevo, bacon y Queso + 2 Danesas + Mini Triffle a eleccion + Cafe con Leche o Te o Jugo + Tarjeta dia del Padre y stickers",
        "category": "Dia del padre",
        "options": [
            {
                "options": [
                    {
                        "price": 0,
                        "id": "4tTWDn-n9m",
                        "title": "Triffle Blondies"
                    },
                    {
                        "id": "OPYJNtlsR",
                        "title": "Triffle Light con frutas de estación",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Seleccion de Mini Triffle",
                "id": "GmLtx_WCj"
            },
            {
                "options": [
                    {
                        "title": "Cafe Con Leche",
                        "id": "1tY89Cs6sY",
                        "price": 0
                    },
                    {
                        "id": "sdM0hNAJm",
                        "title": "Cafe  Americano",
                        "price": 0
                    },
                    {
                        "id": "9F_53tBsY",
                        "price": 0,
                        "title": "Te Negro en Hebras"
                    },
                    {
                        "title": "Jugo de Naranja",
                        "id": "z6JFsLjMN",
                        "price": 0
                    },
                    {
                        "id": "2M-YOwlic",
                        "price": 0,
                        "title": "Chocolatada caliente"
                    },
                    {
                        "price": 0,
                        "id": "H8uO3blt0",
                        "title": "Te saquito en Hebras Negro"
                    },
                    {
                        "id": "1mdHVpTmY",
                        "price": 0,
                        "title": "Te saquito en Hebras Verde"
                    },
                    {
                        "price": 0,
                        "id": "kdQBljlRP",
                        "title": "Te saquito en Hebras Frutos Rojos"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion de Bebida",
                "id": "-oSlbOLsV"
            }
        ],
        "originalPrice": 0,
        "price": 0,
        "title": "Merienda Box Dia del Padre ",
        "visibility": "hidden",
        "id": "k7DV6bLqygqnJBriQazy",
        "subcategory": "Desayuno para uno"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334515/blondies/tn9ezfpgpaitwxbqmfpv.jpg",
        "featured": false,
        "description": "Cafe 100% Arabica Blend Blondies",
        "category": "Cafeteria",
        "options": [],
        "originalPrice": 0,
        "price": 125,
        "title": "Capuccino",
        "visibility": "available",
        "id": "kLwrSEkbXI0amlslSyCs",
        "available": true,
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334575/blondies/jap49ohyud758ye0lal7.jpg",
        "featured": false,
        "description": "Te en Hebras en saquito",
        "category": "Cafeteria",
        "options": [
            {
                "options": [
                    {
                        "price": 0,
                        "id": "dSlDU3NAKy",
                        "title": "Negro"
                    },
                    {
                        "price": 0,
                        "title": "Frutos Rojos",
                        "id": "cfuGDBP0N"
                    },
                    {
                        "title": "Vainilla",
                        "id": "gysA4JrxM",
                        "price": 0
                    },
                    {
                        "id": "1a7yp2h2b",
                        "price": 0,
                        "title": "Lemon Grass"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion de Te",
                "id": "V6WGT162x",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 110,
        "title": "Te en hebras",
        "visibility": "available",
        "id": "l6HWrsYEXKLShmAa0TRr",
        "available": true,
        "subcategory": "Te"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1594212636/blondies/ncmcihmxf9xcsilwgxcx.jpg",
        "featured": false,
        "description": "Elección 2 cuadrados Dulces a elección + 4 Danesas o Croissants + Alfajores de maicena con Dulce de leche (250 grs) +Bizcochitos de queso (250 grs)",
        "category": "Bandejas",
        "options": [
            {
                "options": [
                    {
                        "title": "Cheesecake Clasico",
                        "price": 0,
                        "id": "HsMHb-k_P3"
                    },
                    {
                        "id": "oqK8nF04E_",
                        "price": 0,
                        "title": "Cheesecake Dulce de Leche"
                    },
                    {
                        "title": "Cheesecake Oreo",
                        "id": "WUY9nYlQI",
                        "price": 0
                    },
                    {
                        "id": "AJGMbw0MC",
                        "price": 0,
                        "title": "Cuadrado Ganache de Chocolate"
                    },
                    {
                        "price": 0,
                        "id": "6M6cFRAbD",
                        "title": "Cuadrado Carrot Cake"
                    },
                    {
                        "price": 0,
                        "title": "Cuadrado Brownie",
                        "id": "2oSLtVd_p"
                    },
                    {
                        "title": "Cuadrado Blondies",
                        "price": 0,
                        "id": "E6qTCscgc"
                    },
                    {
                        "price": 0,
                        "id": "emTpqkqdX",
                        "title": "Cuadrado  Oreo"
                    }
                ],
                "count": 2,
                "required": true,
                "value": [],
                "title": "Elección Cuadrados Dulces",
                "id": "YR2XHbQNJy"
            },
            {
                "options": [
                    {
                        "title": "Danesas",
                        "id": "RePqUS-wBj",
                        "price": 0
                    },
                    {
                        "title": "Croissants",
                        "id": "dGeRvFV5qn",
                        "price": 0
                    }
                ],
                "count": 4,
                "required": true,
                "value": [],
                "title": "Eleccion Danesas o Croissants",
                "id": "fuWy2ftt-"
            }
        ],
        "originalPrice": 0,
        "price": 1050,
        "title": "Bandeja Blondies Medium",
        "visibility": "available",
        "id": "lLfVSTsEWARf9P7TL0df"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1589482712/blondies/a0aciwvt02mdmeyogm7g.jpg",
        "featured": false,
        "description": "Papas fritas con Queso Cheddar y Panceta",
        "category": "Papas Fritas",
        "options": [],
        "originalPrice": 0,
        "price": 230,
        "title": "Papas fritas con Queso Cheddar y Panceta",
        "visibility": "available",
        "id": "lZaFBAeUXwyLHvYJGELL",
        "available": true,
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590410321/blondies/nwagdqipao4atxth1zlf.jpg",
        "featured": false,
        "description": "2 Platos a elección + 2 Bebidas + 2 Postres ",
        "category": "Combo del dia",
        "options": [
            {
                "options": [
                    {
                        "title": "Wok de pollo ",
                        "id": "6V5nGE1tEE",
                        "price": 0
                    },
                    {
                        "id": "uq90GF6Lx",
                        "title": "Wok de Carne",
                        "price": 0
                    },
                    {
                        "id": "yiRXsAyav",
                        "price": 0,
                        "title": "Wok Vegetariano"
                    },
                    {
                        "id": "ju-WX1dIv",
                        "price": 0,
                        "title": "Ensalada Blondies"
                    },
                    {
                        "id": "LNlVkFtgS",
                        "price": 0,
                        "title": "Ensalada Caesar"
                    },
                    {
                        "title": "Ensalda de Calabaza",
                        "id": "1VgpBLCe3",
                        "price": 0
                    },
                    {
                        "title": "Hamburguesa Clasica con papas fritas",
                        "price": 0,
                        "id": "s1AlmaM80"
                    },
                    {
                        "title": "Hamburguesa pollo crispy con papas fritas",
                        "id": "gZ4IHLoIP",
                        "price": 0
                    },
                    {
                        "id": "8TUNgQgXq",
                        "title": "Chicken fingers con papas fritas",
                        "price": 0
                    },
                    {
                        "title": "Wrap de Pollo",
                        "price": 0,
                        "id": "Z3C2SVKBl"
                    },
                    {
                        "id": "REdY3zu5w",
                        "title": "Wrap de Carne",
                        "price": 0
                    },
                    {
                        "id": "m2QffWRgu",
                        "price": 0,
                        "title": "Wrap Vegetariano"
                    }
                ],
                "count": 2,
                "required": false,
                "value": [],
                "title": "Eleccion de Platos",
                "id": "LDUPElUH2",
                "type": "multiple"
            },
            {
                "options": [
                    {
                        "id": "8HiIBndZ5n",
                        "title": "Coca Cola",
                        "price": 0
                    },
                    {
                        "title": "Coca Cola Light",
                        "price": 0,
                        "id": "Gf4U47mouk"
                    },
                    {
                        "title": "Coca Cola zero",
                        "price": 0,
                        "id": "BtcnUxRy-"
                    },
                    {
                        "id": "ZOcvK0-Ki",
                        "price": 0,
                        "title": "Sprite"
                    },
                    {
                        "price": 0,
                        "id": "9EzPEJG-X",
                        "title": "Fanta"
                    },
                    {
                        "title": "Agua con gas",
                        "id": "er0WEeKxh",
                        "price": 0
                    },
                    {
                        "id": "JY0W_gpzL",
                        "title": "Agua sin gas",
                        "price": 0
                    }
                ],
                "count": 2,
                "required": false,
                "value": [],
                "title": "Elección de Bebidas",
                "id": "T9ijx0jsQ",
                "type": "multiple"
            },
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Postre del dia",
                        "id": "mvKyuCFhDo"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección de postre",
                "id": "LQtNZKLhc",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 685,
        "title": "Combo del dia comen 2 personas (Lunes a Viernes)",
        "visibility": "available",
        "id": "m4GuuIEybvem4WRmPMyb",
        "subcategory": "",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335367/blondies/utndoudlab9hz5otd768.jpg",
        "featured": false,
        "description": "Vegetales Grillados ",
        "category": "Wraps",
        "options": [],
        "originalPrice": 0,
        "price": 300,
        "title": "Wrap Vegetariano (Incluye Papas fritas o ensalada de verdes)",
        "visibility": "available",
        "id": "mbLc113p9cwfN1s3inav",
        "subcategory": "Vegetales",
        "available": true
    },
    {
        "originalPrice": 0,
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334648/blondies/oi8mn7pdznlavo4vo8v4.jpg",
        "options": [],
        "featured": false,
        "price": 900,
        "category": "Cumpleanos",
        "description": "Vainilla + Chocolate + Dulce de Leche (Equivale 2 porciones de torta Aprox)",
        "id": "mcHQqOBY3kp9cljXZgqQ",
        "title": "Minicake Vainilla y Chocolate (un dia antes de anticipación)",
        "visibility": "available",
        "subcategory": "Minicakes"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334962/blondies/awwi0fobd8m4miq9iklw.jpg",
        "featured": false,
        "description": "Nutella+Crema+Frutillas+Banana",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 330,
        "title": "Waffles Nutella",
        "visibility": "available",
        "id": "o8t39EWceM9hYApMLOFN",
        "subcategory": "Waffles",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334995/blondies/qmvrozvqq7zcbc2jazhi.jpg",
        "featured": false,
        "description": "Waffles harina integral + Banana + Salsa de Arandanos",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 320,
        "title": "Waffles Veganos",
        "visibility": "available",
        "id": "oZ4hEX9tSjfxO1rsUZ2d",
        "subcategory": "Waffles",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335015/blondies/qiy2yhhewepe7pdumwm1.jpg",
        "featured": false,
        "description": "Pollo+ Mix de Verdes + Croutones + Parmesano ",
        "category": "Ensaladas",
        "options": [],
        "originalPrice": 0,
        "price": 270,
        "title": "Ensalada Caesar",
        "visibility": "available",
        "id": "p5loJFKHfgK6NvTREd6z",
        "subcategory": "",
        "available": true
    },
    {
        "description": "",
        "featured": false,
        "title": "Croissant por unidad",
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1591725662/blondies/q66nas3hw4lejxa1xqpg.jpg",
        "originalPrice": 0,
        "price": 75,
        "category": "Desayunos y Meriendas",
        "options": [],
        "visibility": "available",
        "id": "p5p53RC0MUWzw7FuBv3v"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590412515/blondies/oztwkma8br9ho24qbcym.jpg",
        "featured": false,
        "description": "Pan casero + carne + Cebolla caramelizada + Panceta + Queso provolone",
        "category": "Hamburguesas",
        "options": [
            {
                "options": [
                    {
                        "title": "Papas fritas",
                        "id": "Qs2upcYZNG",
                        "price": 0
                    },
                    {
                        "title": "Ensalada de verdes",
                        "id": "1JEIRX5Yc",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Acompañamiento ",
                "id": "00HxQfSQd",
                "type": "single"
            },
            {
                "options": [
                    {
                        "price": 0,
                        "id": "fXPZS6UVZj",
                        "title": "Mayonesa"
                    },
                    {
                        "price": 0,
                        "id": "DuslvRR2b",
                        "title": "Ketchup"
                    },
                    {
                        "title": "Mostaza",
                        "price": 0,
                        "id": "2QeoHzuF5"
                    },
                    {
                        "title": "Salsa bbq",
                        "price": 0,
                        "id": "DzH_TkeEb"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Aderezos",
                "id": "8e4BaAHwL",
                "type": "single"
            }
        ],
        "originalPrice": 0,
        "price": 360,
        "title": "Hamburguesa Carne Provoleta (INCLUYE PAPAS FRITAS)",
        "visibility": "available",
        "id": "qKQnzfc3ZsH4Scky67df",
        "subcategory": "Carne"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1591189129/blondies/uywhrcusybgtdilddugy.jpg",
        "featured": false,
        "description": "Pan de Campo con Mermelada o dulce de leche y queso crema + 4 Medialunas +2 Muffin a Elección + 2 Cuadrados Dulces a Elección + tarjeta y stickers dia del padre",
        "category": "Dia del padre",
        "options": [
            {
                "options": [
                    {
                        "id": "54nhuiDwVD",
                        "title": "Frutos Rojos",
                        "price": 0
                    },
                    {
                        "id": "vW1amjt6G3",
                        "price": 0,
                        "title": "Doble Chocolate"
                    },
                    {
                        "id": "rhE6YbjQY",
                        "price": 0,
                        "title": "Banana"
                    }
                ],
                "count": 2,
                "required": false,
                "value": [],
                "title": "Eleccion de Muffin",
                "id": "mMAfVjE3D"
            },
            {
                "options": [
                    {
                        "id": "urTGpk6BkO",
                        "price": 0,
                        "title": "Cheesecake Clasico"
                    },
                    {
                        "title": "Cheesecake Dulce de Leche",
                        "id": "dmeFD5HDCm",
                        "price": 0
                    },
                    {
                        "title": "Cheesecake Oreo",
                        "id": "sfTOfOmkJ",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "title": "Cuadrado Ganache de Chocolate",
                        "id": "tnnsrbyXd"
                    },
                    {
                        "price": 0,
                        "id": "mUvBwlUq7",
                        "title": "Cuadrado Carrot Cake"
                    },
                    {
                        "title": "Cuadrado Blondies",
                        "price": 0,
                        "id": "fN2Q-NXl2"
                    },
                    {
                        "price": 0,
                        "title": "Cuadrado Brownie",
                        "id": "RkuKR0RkD"
                    },
                    {
                        "id": "clul5XYj_",
                        "price": 0,
                        "title": "Cuadrado Oreo"
                    }
                ],
                "count": 2,
                "required": false,
                "value": [],
                "title": "Eleccion Cuadrado Dulce",
                "id": "dywIa7vN8"
            },
            {
                "options": [
                    {
                        "price": 120,
                        "title": "Cafe con Leche",
                        "id": "kvv2ZzglqI"
                    },
                    {
                        "title": "Cafe Americano",
                        "id": "HaB0GqHpNI",
                        "price": 110
                    },
                    {
                        "price": 140,
                        "title": "Chocolatada Caliente ",
                        "id": "p2UFq63Vi"
                    },
                    {
                        "id": "ECRQF7WX4",
                        "price": 160,
                        "title": "Submarino "
                    },
                    {
                        "title": "Jugo de Naranja ",
                        "price": 160,
                        "id": "TuSMocW6L"
                    }
                ],
                "count": 5,
                "required": false,
                "value": [],
                "title": "Eleccion de Bebida o Infusion (Precio Aparte)",
                "id": "iAi7SICSH"
            }
        ],
        "originalPrice": 0,
        "price": 0,
        "title": "Merienda Box Dia del Padre Familiar (Bebida Aparte)",
        "visibility": "hidden",
        "id": "qZyYFEsd5NeMUfbh7B2Z",
        "subcategory": "Desayuno o Merienda Familiar"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334356/blondies/lmpnsducr78w4odgt9dm.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 85,
        "title": "Coca cola Zero 600 cc",
        "visibility": "available",
        "id": "rfGE3LorCv0kyyZdHRht",
        "available": true,
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334980/blondies/rawe0sxorgcdpl9wkeqe.jpg",
        "featured": false,
        "description": "Oreos+Crema+Salsa de Chocolate+Dulce de Leche",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 330,
        "title": "Waffles Oreo",
        "visibility": "available",
        "id": "s7nLRATiYYzwCcqcjGjs",
        "subcategory": "Waffles",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1598872585/blondies/sqnxzwfgfhj2c2mw3q81.jpg",
        "featured": false,
        "description": "Bebidas:\n\n* Te en Hebras Saquito Indra o Cafe de Especialidad en Saquito Puerto Blest. \n* Jugo de Naranja exprimido en Botella 250 cc.\n* Botella Agua Mineral 500 cc.\n\nComestible\n\n* Mini pan de Campo Artesanal para tostadas con mermeladas y queso crema. \n* 2 Danesas\n* Triffle de Yoghurt + Granola Artesanal + salsa de frutos rojos\n* 2 Scones de Parmesano\n* Galletitas dulces Artesanales variadas 250 Gramos (Pepas, Limon, Alfajores de maicena)",
        "category": "Bandejas para Empresas",
        "options": [
            {
                "options": [
                    {
                        "title": "Te Negro en Hebras Saquito",
                        "price": 0,
                        "id": "JOJjIsBtk5"
                    },
                    {
                        "price": 0,
                        "title": "Te verde en Hebras Saquito",
                        "id": "U9SvqNSfs5"
                    },
                    {
                        "price": 0,
                        "title": "Te frutos Rojos en Hebras Saquito",
                        "id": "NoPqnYxAU"
                    },
                    {
                        "id": "9BKl6weDr",
                        "price": 0,
                        "title": "Cafe de Especialidad en Saquito"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección Infusion",
                "id": "bsrqH52Z9c"
            }
        ],
        "originalPrice": 0,
        "price": 1300,
        "title": "Bandeja para Regalo Empresa 2 (Solicitar 48horas antes)",
        "visibility": "available",
        "id": "sk5BZT7yJPWSyg4vJDw5"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590409683/blondies/tfgbsi81otqlvhidduqn.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 160,
        "title": "Limonada artesanal ",
        "visibility": "available",
        "id": "splxWYRDU2hFyCZs8ruO",
        "subcategory": "Limonadas",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590414370/blondies/xptbdtqpe5uw3ggrm6sm.jpg",
        "featured": false,
        "description": "Salmon ahumado + Verdes + Salsa",
        "category": "Wraps",
        "options": [],
        "originalPrice": 0,
        "price": 380,
        "title": "Wrap Salmon Ahumado (Incluye Papas fritas o ensalada de verdes)",
        "visibility": "available",
        "id": "tod31irLrzORAVX4uNBt",
        "subcategory": "Pescado",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335050/blondies/ldudv6llgy7scykd71zs.jpg",
        "featured": false,
        "description": "Tiras de pollo panado con panko y semillas + Papas fritas",
        "category": "Hamburguesas",
        "options": [],
        "originalPrice": 0,
        "price": 300,
        "title": "Chicken Fingers de Pollo",
        "visibility": "available",
        "id": "u1wyWLRmx4CQRap2yj95",
        "available": true,
        "subcategory": "Pollo"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334294/blondies/ufxi0d2egtfyw9fpyt7b.jpg",
        "featured": false,
        "description": "",
        "category": "Bebidas",
        "options": [],
        "originalPrice": 0,
        "price": 85,
        "title": "Coca cola 600 cc",
        "visibility": "available",
        "id": "uP4sZCTGrXNUB9AWKgnu",
        "available": true,
        "subcategory": ""
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335170/blondies/ywunmrembewbfsvulcaa.jpg",
        "featured": false,
        "description": "Porcion de papas fritas",
        "category": "Papas Fritas",
        "options": [],
        "originalPrice": 0,
        "price": 180,
        "title": "Papas Fritas Porcion",
        "visibility": "available",
        "id": "uTrUavy81NAgrVei591R",
        "subcategory": "",
        "available": true
    },
    {
        "originalPrice": 0,
        "title": "Cafe en Granos o Molienda para preparación preferida (1/4)",
        "subcategory": "",
        "description": "Un cuarto de Cafe 100% Arabica Blend Blondies para tu casa",
        "options": [],
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334500/blondies/o1nklao7ntbrk55lq3jl.jpg",
        "category": "Cafeteria",
        "id": "ums8VBjCBfmIZ4FSDvvM",
        "featured": false,
        "visibility": "available",
        "price": 700
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334662/blondies/jyacbnwshvset0a7vcnm.jpg",
        "featured": false,
        "description": "Blondies (Brownie Chocolate Blanco)",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 160,
        "title": "Cuadrado Blondies",
        "visibility": "available",
        "id": "vWohYqPEJoH9THBsW7MZ",
        "subcategory": "Cuadrados Dulces",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590335190/blondies/g4uc9ypq0uejxlev3kvf.jpg",
        "featured": false,
        "description": "Banana",
        "category": "Pasteleria",
        "options": [],
        "originalPrice": 0,
        "price": 175,
        "title": "Muffin de Banana",
        "visibility": "available",
        "id": "vbTfYAcKQQnk8OXytimg",
        "subcategory": "Muffins",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334797/blondies/ajtmbqauz8tc83wvw3cs.jpg",
        "featured": false,
        "description": "Cuadrado Oreo",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 185,
        "title": "Cuadrado Oreo",
        "visibility": "available",
        "id": "vehmdL2HwzTLgjCNogGM",
        "available": true,
        "subcategory": "Cuadrados Dulces"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1591203544/blondies/jjnqyhov98px40bagi2i.jpg",
        "featured": false,
        "description": "Bagel con Huevo, panceta y queso + 2 Mini Scone de Queso + Canasta de Panes caseros con mermelada y queso crema + 2 Mini Triffles Light + 1 Cuadrado Dulce a eleccion + 2 Danesas + 2 Cafe con leche o Te en Hebras + Jugo de Naranja + Tarjeta Dia del Padre",
        "category": "Dia del padre",
        "options": [
            {
                "options": [
                    {
                        "price": 0,
                        "title": "Cheesecake Clasico",
                        "id": "0AdzBV98BB"
                    },
                    {
                        "price": 0,
                        "id": "rpmmr6EibS",
                        "title": "Cheesecake Oreo"
                    },
                    {
                        "price": 0,
                        "title": "Cheesecake Dulce de Leche",
                        "id": "em4cPEuRu"
                    },
                    {
                        "id": "GGJwVdBYC",
                        "title": "Cuadrado Ganache de Chocolate",
                        "price": 0
                    },
                    {
                        "title": "Cuadrado Carrot Cake",
                        "price": 0,
                        "id": "DjMQse9c1"
                    },
                    {
                        "id": "vCmR3qyfh",
                        "title": "Cuadrado Blondies",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "id": "0zVZJmh--",
                        "title": "Cuadrado Brownie"
                    },
                    {
                        "id": "8D7EzvuFg",
                        "price": 0,
                        "title": "Cuadrado Oreo"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección de Cuadrado Dulce",
                "id": "dbFjruS06"
            },
            {
                "options": [
                    {
                        "price": 0,
                        "id": "HRpnUuzUEs",
                        "title": "Cafe con Leche"
                    },
                    {
                        "title": "Cafe Americano",
                        "id": "X2KjcE2LMo",
                        "price": 0
                    },
                    {
                        "price": 0,
                        "title": "Te saquito en Hebras Negro",
                        "id": "tC5NSTezd"
                    },
                    {
                        "id": "mMH4dQdIU",
                        "price": 0,
                        "title": "Te saquito en Hebras Verde"
                    },
                    {
                        "title": "Te saquito en Hebras Frutos Rojos",
                        "id": "GJOO-2BkV",
                        "price": 0
                    }
                ],
                "count": 2,
                "required": false,
                "value": [],
                "title": "Eleccion de Bebidas ",
                "id": "mI2-jGGMx"
            }
        ],
        "originalPrice": 0,
        "price": 0,
        "title": "Box Brunch Dia del Padre (Entrega disponible a partir de las 12 del medio dia)",
        "visibility": "hidden",
        "id": "xNWLQEXFEzZrD7YM0lBr"
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334834/blondies/wr5izvav7tkwugq05djc.jpg",
        "featured": false,
        "description": "Cuadrado dulce + Danesa + Muffin a eleccion",
        "category": "Desayunos y Meriendas",
        "options": [
            {
                "options": [
                    {
                        "id": "1tx7chfZck",
                        "title": "Cheesecake Clasico",
                        "price": 0
                    },
                    {
                        "title": "Cheesecake Oreo",
                        "price": 0,
                        "id": "o5TR2oIcT"
                    },
                    {
                        "price": 0,
                        "title": "Cheesecake Dulce de Leche",
                        "id": "ubGoe9aol"
                    },
                    {
                        "price": 0,
                        "id": "22DYS7aQP",
                        "title": "Cuadrado Ganache de Chocolate"
                    },
                    {
                        "id": "xOf4u1FJ1",
                        "price": 0,
                        "title": "Cuadrado Carrot Cake"
                    },
                    {
                        "title": "Brownie",
                        "id": "UAA-60YQO",
                        "price": 0
                    },
                    {
                        "title": "Blondies (Brownie chocolate Blanco)",
                        "id": "AaGej2lj0",
                        "price": 0
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Eleccion Cuadrado Dulce",
                "id": "N3KqN7hBD"
            },
            {
                "options": [
                    {
                        "id": "BJZ9mYFNof",
                        "price": 0,
                        "title": "Frutos Rojos"
                    },
                    {
                        "title": "Chocolate",
                        "price": 0,
                        "id": "ZZw1jCoJB"
                    },
                    {
                        "price": 0,
                        "id": "PfBgiEWoz",
                        "title": "Banana"
                    }
                ],
                "count": 1,
                "required": false,
                "value": [],
                "title": "Elección de Muffin",
                "id": "JyFJCD4Gg"
            },
            {
                "options": [
                    {
                        "price": 120,
                        "title": "Cafe con Leche",
                        "id": "ylbgp10LsA"
                    },
                    {
                        "id": "FPdwBtixQ-",
                        "title": "Cafe Americano",
                        "price": 110
                    },
                    {
                        "title": "Submarino",
                        "price": 160,
                        "id": "Eb08nG80r"
                    },
                    {
                        "id": "b7KPaFRdJ",
                        "title": "Te saquito en Hebras Negro",
                        "price": 110
                    },
                    {
                        "title": "Te saquito en Hebras Verde",
                        "price": 110,
                        "id": "hz5kovu9Y"
                    },
                    {
                        "id": "dkht9cmNH",
                        "price": 110,
                        "title": "Te saquito en Hebras Frutos Rojos"
                    }
                ],
                "count": 0,
                "required": false,
                "value": [],
                "title": "Elección de Bebida (precio aparte)",
                "id": "S6hVR3ZNY"
            }
        ],
        "originalPrice": 0,
        "price": 525,
        "title": "Desayuno Blondies (Bebida o Infusion Opcional)",
        "visibility": "available",
        "id": "xxiTe1JU0AnHoLL34Ivc",
        "subcategory": "Desayuno",
        "available": true
    },
    {
        "image": "https://res.cloudinary.com/franbellocchio/image/upload/v1590334918/blondies/wih5bzmuvm9se14kqn0k.jpg",
        "featured": false,
        "description": "Granola Casera + Yoghurt descremado + Frutas de Estacion",
        "category": "Desayunos y Meriendas",
        "options": [],
        "originalPrice": 0,
        "price": 200,
        "title": "Triffle Light",
        "visibility": "available",
        "id": "yAjQDYSLT3grWD6nBUQQ",
        "available": true,
        "subcategory": "Triffle"
    }
]; 

    products.forEach((product) => {
      batch.create(
          database.collection("tenants").doc(tenant).collection("products").doc(product.id),
          product,
        );
    });

    return batch.commit()
  },
};

export default api;

