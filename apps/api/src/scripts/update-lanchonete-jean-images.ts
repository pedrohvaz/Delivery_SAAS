import { PrismaClient } from '@delivery/database'

const prisma = new PrismaClient()

const STORE_SLUG = 'lanchonete-jean'

// ─────────────────────────────────────────────────────────────────────────
// name -> imageUrl
// ─────────────────────────────────────────────────────────────────────────

const IMAGES: Record<string, string> = {
  // ─── Lanches ───────────────────────────────────────────────────────────
  'X Burguer': 'https://lh3.googleusercontent.com/9xeXpGRVuQED8T-rQdbiOU47DEmKtDJF5n_tvBHbi7gC4wdb0V6IUPO56TZm68QDiBZRZ5rr0BGNF3LPVOiKbF_bqFFiZkj_=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Salada': 'https://lh3.googleusercontent.com/w8IbFImjxRq-vkYH_TRsFlRlNfv0PT44u89jVSHW20_5ZbkOEZw_AxQLh9B3euyuTioPD9q35wTHHwjiN0sTrUpgXWoKyIyTUg=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Egg Burguer': 'https://lh3.googleusercontent.com/xupqatsBC6wTYm5lo4JT6SmoQ4gBGPdMN_h0uegbWcpK-vo2Ldgtn7yL0V5iI6kPE76k5aVYZEujc9_uxP6lV26YnU6TnXMz=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Bacon': 'https://lh3.googleusercontent.com/if07SyauvnStLyLtYy5zLUrN7uzTMabu3CXxBs7Tq9IPFSd2ed_Ru3T6kI7uq8C2A0Pf6xFGT3SMS36RXyxwFcoSoStufA5_VA=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Tudo': 'https://lh3.googleusercontent.com/rmVlFBBIzuRyxDZbZG02KVWiCVqUNwdL7PmM-m6Xzqta6zH3vhn6BqQXjpPCqTqRSrXabVvLmzTQB2CYAIyOFwxan0DMFRz1Mw=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Tudo Duplo': 'https://lh3.googleusercontent.com/T8NVb-YNK4HN_rWJ3RnjE1BK7eGWRt_bJhJmBhgOiGWRIXsNBVWh5aS6jmqMVq-4m27bqniw8x5-DRMF0FWMT-s-cVxr8MtHSY=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Meque': 'https://lh3.googleusercontent.com/LPr-wHt1fTPy84CG_EGylMPGy3n_mUh3hRXhniLbGPF5xBhiXVo_oODvJW5Kfm7CWHA0RD5LqkEiT8MWfQbQ1E7ZEBBqvEYvg=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Vegetariano': 'https://lh3.googleusercontent.com/DlVb9D6YnV2dA3_T_I1yN_G4ZMdvhK8TJyiuS6JxnN2p-yTfJkW5y1K-_lmXjHqVpb0TKmtYGSQl5PB8lhb2BQJo12sn3Uqbg=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Chedar Bacon': 'https://lh3.googleusercontent.com/vlbD5OIKPWD5EJe75jMSsBdXwMXkfkj3iJmrKPZdO5HGXE4M5hXr2aWkB60pJW3fN_0u1UYH_vRkw4VKDH01YPBz-6B1QOMJQ=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Cheddar Tudo': 'https://lh3.googleusercontent.com/sSGXEDJHVqEVnbEFSJnzRD4tLCJL3MJv-xMTf40SgUEm3B0Z6GNqMVoGFTPOOBdqy_iWS_IfFefklFpMLnBlCXWH7KwrxzYD=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Frango Burguer': 'https://lh3.googleusercontent.com/8ZJf3kXWv5HBUfXmikD-f8u8A9k8i0h5RHQqjkJNS0Ugh0PXnO1JX2J9Xc47YMKCvhqxf80xMhXlriehwkN5FNkLaYSnXFkSA=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Frango Salada': 'https://lh3.googleusercontent.com/wJkIWkRNpfDqxNEuLsEMKn00KGNxe67I-nJq3Itkz28Eg24KsaBG8xnHM1MNwMfmVqMPNsquYHKYmJiqHxhMdTHe17U0B0gJvg=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Frango Egg Burguer': 'https://lh3.googleusercontent.com/h1eiDR3NIfWtAjbS_pWqx4SodUFj_WsT9LxmMjnA0H3M3-1GZYbAFT6OizRqwFi2FjK8fJFXK0LNQNLjPVeN_pPm1EJqOFLYg=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Frango Bacon': 'https://lh3.googleusercontent.com/LGqpJbXJ_6Aa_a6MLsA0yxCPcGaSMxB6c_g0TcpJzLdLGlLlvGhFcT8JKV_eSA34hBN9d__m7kq5XdmIfxhV63T2NdBv5RR7mQ=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Frango Tudo': 'https://lh3.googleusercontent.com/gFSwpO0LDi5yMv1GKXoBg8RCSQS4K0FyJhFCPr2iyZ3BoQnBq_t2m6mAqb9Y93MbVwHxO0glGJIqMXKv2u1_tMbpCaXgJC0=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Frango Tudo Duplo': 'https://lh3.googleusercontent.com/hNNyvJwtlULIIaMRKKW2MF9l6-oNc3LJGC-EVE9l5KhVZ7ViqFr98grlJ15nWzOXzRnvMW3OoajOwA1f6n0UrVJPUNW4-vFD=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Frango Meque': 'https://lh3.googleusercontent.com/c3BOqHSSvTZQl0_fz1YoNlHFwO7vPFijy6OkqbpWCbMDG5C77iqUvdBE0g0xJB16CfFqBE2M98-hm_8zSwWJb_Wkw6z_q2Tw=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Frango Cheddar Bacon': 'https://lh3.googleusercontent.com/5vEQ4LXWT_m9OB4CVzRmGDFJsxLi35oQxekn3_bHiluC9pW-3U6UKFMUaVXo7Hm_jkJlTv9G2R37qKhAXQrUhUoS4VuCIVo=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Frango Cheddar Tudo': 'https://lh3.googleusercontent.com/yQYo3xJoiS7CbpC6JveSPcVN4KSdnw4oRj0qeRomYOGJn60LD2a_fDMCH_P-RHBJpefCQ6hVdF-Cbs5VRCjH_W8dYJX5xLPKg=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Filé': 'https://lh3.googleusercontent.com/vZPrQmV5aAjF8yGmKdqzIiLTHr3rjbCB4c_O7cJMjnMsHXOMLTOkfaCLZ88VQpKvKPK0EqJi0wLKhFVpf45LX0dGKuqcDX4=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Filé Bacon': 'https://lh3.googleusercontent.com/47CTlgg0YekbmJSsVbW53mky63tYEEKKu2xpDoqVwynKNeWQva_mShoUwgVo9Hna9SHG17rAiBN17-m8xy59k78-gNeqA9gADA=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'X Filé Egg': 'https://lh3.googleusercontent.com/FR72gy3KkZQio1IV6rR0dWCS9FXPmElTjdEos20YKvsUlqMqPTcC5hq1vwc7K9PsFFBn6eK7dSlgBpf3GBEfF5DarlHBskqwhA=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',

  // ─── Sanduíches Artesanais ────────────────────────────────────────────────
  'Artesanal Clássico': 'https://lh3.googleusercontent.com/eWyJd0HVmGTqH7Gl0b4RBZNN5LKDQVRHSIXuVRSs6xYm0p_DwcafLBj7N3x-iqJ6Cn4P9oXAqALuqJ_GxVxinQTF3Cj-8k=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Artesanal Misto': 'https://lh3.googleusercontent.com/EuWkjfELLgYR9-7wr5r3l5W0TGFRHr5nW_QnvLo2k0SaWPT5T0FvPCRULnw-f4IpCWQSJSaRdJU-KUGP2_6_1_aBzsMSDU=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Artesanal Bacon': 'https://lh3.googleusercontent.com/JcUZlalLJxQ5wEWS4n_uyVh7b72x3y9ZJFMEEzMVumYqJmK2e-QKrCJHRLvAL_gFq3OG3qjJwqNQhX6VJv-PY7fJBZUKk8=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Artesanal Tudo': 'https://lh3.googleusercontent.com/y-k2BtVKuNIJRoJxVz4VV_qp4DI0nBGb0N8U1T-pBMRzxBrBHe_jAiP3a9mGvkr7EjF2mI7vEhFn6NqIqaJbpCUSBHkAVk=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Artesanal Duplo': 'https://lh3.googleusercontent.com/VG_HrM_ZuYmZPiAWG3vsFH0B3TLJxQl_FrJfkxFRuaJhLR6d9qjT4hEEqTI1eAdlxKUGMU9i3FnnxwIPAX90K7Qul_bLXA=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Artesanal Duplo Bacon': 'https://lh3.googleusercontent.com/8xHvDXisMqtGS_Kfwi6sQiblV9VEqBSC-VFHQBA3EaUAI1Xf8IzqgjbWnWCvCNjVWAJgKgajR6LnE09g7eA8r11uqiinEuO=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Artesanal Frango Clássico': 'https://lh3.googleusercontent.com/a-DJiHqr5TG8N8bj27i5AEWM5-0xVq-EVVXrRSMBRUivR5a5YIExAaeDpEXr8khtTKIFCOT1luyQRJKYkxHBJqoS8P6kN8=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Artesanal Frango Bacon': 'https://lh3.googleusercontent.com/WRlUKGqMJl-4jdqo5eBfkePVi7zy7tVWCHqRWxH7s8S4b-3oIe58uK3iR7_e5mJY8SsHlHoJFrMUgEk7WRSVugnaMM72hw=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Artesanal Frango Tudo': 'https://lh3.googleusercontent.com/i8aSuimDmflNsULk1eWpETq_CjvpHNlC5ZDY66QY0nE9hc0p8B_LiB8mZuWr8IjBMeY_v4WOKH0Ea5KuF0W-_p4zJ44kH4=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Artesanal Vegetariano': 'https://lh3.googleusercontent.com/sAHuWK0eR5hRLN6dKpxyvZf-ZQHvE3Fo-yajBMqhpjGdYTJPHf2hZdJmVAMpSC5zPaM0JE7OaXl1bHkT-l5gWUfUAHfOsA=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',

  // ─── Mistos ────────────────────────────────────────────────────────────
  'Misto Simples': 'https://lh3.googleusercontent.com/j5z27Y3RXNKXbMsWZLstHgRxzMT_IHZlb1dOw9pj5Og_ELnBtj_t11rE5DqwJ1jxSzJFO_hJiXV7UiGJqKHdB6YqTHiF-8=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Misto com Ovo': 'https://lh3.googleusercontent.com/ybgbbV1D51wMlm4-m5aK8RL7JN9kpMo2X-xtJkUPvr13vHLbsTDWMg7-ht5w1gq2P6zU4CuK7UGe0gAZ_G8DJXQ0_oFbWb=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Misto com Bacon': 'https://lh3.googleusercontent.com/BwsEHCJwQE9mjOY9v_bsv_n3CtrV_2ZRBBOVfIjFk8mVpS7G-x8_MaB0h6G_M3ePTmCFxHAFOZsOenWxFE-oeYvBiJ2A0k=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Misto com Bacon e Ovo': 'https://lh3.googleusercontent.com/2rsTK_kHnHy3lGIBCkWPHqr3PvgaTh9UE1tXMVCCzVfL8ZDHcBFXJjp-IXkSfPYJnU9Q3gQMCVVklrb0pVOLf2u8LVHX3o=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',

  // ─── Pizzas ────────────────────────────────────────────────────────────
  'Pizza Á Moda': 'https://lh3.googleusercontent.com/YOM4u5XQCHkjfMEBnSeVvI43O9OXlwEeSifuLBLlci9Jc3CVYnz9utorTNk5ON7vb_wnl9BKupn2vZgKE4psQkjRfa7HoE9H_-A=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Pizza Calabresa': 'https://lh3.googleusercontent.com/HvlRAJOyRhSuZDI0y6YGjqCf8P9VyHKkXnCvQ7XfT4-UJkWS3S80_gQHOsHfCOBHYf76VkfuZ72oLX06CrIAPJMaqvuGiTf=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Pizza Frango com Catupiry': 'https://lh3.googleusercontent.com/XRqtNk_C0Qsup0-YVBzpZm1gEZlp5N1o-YmL7Ar7PezaMFnBDT9D9Yp6h7GZCOiD4SzGOE7o5L_Bfbr8NVuKd0dqHfklTl=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Pizza Mussarela': 'https://lh3.googleusercontent.com/5Z0PBmq4f5j9-p0EEFhAoiwjhGGJf5YJMS7MExJn9pGRqpIpfhBKAVm53LBN0UjG5X01e-VuH2UYWD9cZDqABfVN7_97KQ=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Pizza Presunto': 'https://lh3.googleusercontent.com/SgDJAGY-tCfBVrqQ2bE0p7eLlW-e5YtSYmh9kG3fWkmMZCbwXkiEJAbUL_jKe2mFkJrJJt7NUZR-Tz_2i4e8TeBvO7HKGE=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Pizza Portuguesa': 'https://lh3.googleusercontent.com/zzgVZBWEKLxIiSzJmFREGk8R-Ld9W2xbGP8HnXsxbwOZM4T3dVFqLhEuXW5kBHG_Hx1bZG5_Bq8rA3B2xVq5MjJLbKI7fy=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Pizza Toscana': 'https://lh3.googleusercontent.com/iaCF7TFG3bqAP4yMLnalPr-bEE9sxerAmNMEPXs5eUdI4-hGO4p0_3mCPRZ-IhCKN7o1Z8tMRRpE8IJqAFJ7WGx-hHRFl8=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Pizza Palmito': 'https://lh3.googleusercontent.com/lEEjfIL5UuO5DsaqJAHWqkWLj6PNHO5Iu3j4rSQ_IYmfVqSGm8cqWJPY6n8MdXk1daTF9Z7aOoVuLfnJHH6HJTpOIe9L4y=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',

  // ─── Porções ───────────────────────────────────────────────────────────
  'Fritas Simples': 'https://lh3.googleusercontent.com/VEGDr6VVb5t1aSX7Ul4K5fcvYQY0P6Y-XqnS9DibECu94iFz0_iITJ4nrT8tZuWn7pBqWRPTcfzjzXXJpRuHhCxXCv4i0U=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Fritas com Mussarela': 'https://lh3.googleusercontent.com/cTlMIHZ1Rj1Mk0FsFm_HniJHw_T3D0PW-xtM1b4p4zAHFoJQ_3o0v4tqI0jHb8EcFv_mRkVKz9Z9A-E9OYN0oiJ1jkSiWX=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Fritas com Cheddar': 'https://lh3.googleusercontent.com/5KsFWmGsJtnRH2Mfv9LYPetY62W32P9PYmr91WqHjFZJ1H0MU2OBdcr3-qXUmjD30iRf7P4I-cbPbxmhsBSIJL23E5O6FoE=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Fritas com Bacon e Mussarela': 'https://lh3.googleusercontent.com/rHsOsHcgQU7vXrR2wSV1XEAkBJKDvXp3F_a9BM8pniuQf04bPSz5HJFBL5aM4n7xVaxr5o8rNrYEJZbcbpC6Jj5f5z7qnw=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Fritas com Bacon e Cheddar': 'https://lh3.googleusercontent.com/uJW9ZPIoFtIWj7QRiN4ql8mYvFiwbM_QdnLjMqiH_ViGbV-N1tN-fAGmO9FzqhHHYhKSJkE3DYlv2qnSZP4IK7dYgdIK_8=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Fritas com Ovo e Bacon': 'https://lh3.googleusercontent.com/osFzKWc2rdaLRVvKSJBRsJiygfR3f3h8cOkHoKgJqdD1wCp5d58gXA-H_-Sv0yZMHExTAIfT3GNdGU9xD3Y9A9R0swnO4u4=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Onion Rings': 'https://lh3.googleusercontent.com/sfrq1nEVV-rF1ZJwHmZujEqYnXVz9oAtk1N_Lk5q01ADkQlE-6DlmN9z9C6dFIovFmXV_jXIixAarXPhtJJqeJJk-AQYZ4=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Mandioca Frita': 'https://lh3.googleusercontent.com/VtPZxzH1lC4bSoXAriVSDrgbqBw2R9VLRJRQ9NUKy0r0rFl0vH0gxzJ7Kq5U-Cdc5Bs6p5HYKmqTqpEfRMBuU1mY1-OFg=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Mandioca com Queijo': 'https://lh3.googleusercontent.com/nFLqBQSFzL3P8m1f-hZAFGv23z6BWGI5VVDiEXjOjbhzVxBTUxibPQO88fPi1X8lFAy15E8F1mJ-bIopMGc_EX1bqWoK4I=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Pão de Alho Simples': 'https://lh3.googleusercontent.com/rlzVj0xqJEfK-v-fQwi5n_WMGM4S1V1EqpEq_f4rqgJVIrdHniJRMLqR-HiUP8fBFi2ixc0Tf5LdGQ9vHnSoXVn45IjfMg=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Pão de Alho com Queijo': 'https://lh3.googleusercontent.com/1fQSN3tkXWVa7ZtLxCNKhVCifUZDSMPqnhbGrjz5N4S79H2sKP7i4V3FaHOIq_oV3DJZWAZ4TUKR4IhJaqgqZODKFNpyWZ4=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Pão de Alho com Catupiry': 'https://lh3.googleusercontent.com/pZ9_jPvRrT2gQJalfuHmR5gP3cggF0gVWwh06hU8F2Sn4mTqHq7nmXlNjxsNfKm3GZbHkJFivPEQ5l-RNt9GzG03oCaCjk=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Filé Bovino com Fritas': 'https://lh3.googleusercontent.com/vhfXkm0Mg0k_Ocy9RW4FaEkALjX2sHPVHlIJp-7SyOGAIbOHFHf0bSmDyMtajPxR2DEU9c1piCcCm2VZuRNOw1bL32T0JW0=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Filé Mignon com Fritas': 'https://lh3.googleusercontent.com/7pYJEJXLhpS3-JIcUB15gW-q3FdXMJzpV1CGnM4I_1bBF4rVPU7XaU55RlRHHlq0TOWi1r5M3bE_bNi0GkxT5TNWY4C-hI=w612-h420-fcrop64=1,00004b15ffffb1b9-nu-e365-rw',
  'Contra Filé com Fritas': 'https://lh3.googleusercontent.com/ecCX8-CpVLJX7DbIsZVU9We78cP1NCT1nmmPbfE47tTZh1_IEp9g8K9fNYe7yuDbnOahX60GGpnZR-J1498fIhGIC0YPVL8k3ck=w612-h420-fcrop64=1,00004b15ffffb1b9-nu-e365-rw',
  'Porção Mista 1': 'https://lh3.googleusercontent.com/H6_XXZS1DsmqxCb7rfm1SXt0K8bS0LGFIEFkDTZJGlJO4QJ11vH5vfHBv8XizHrv_1pNYJTwC04gqh9EJFU8YQQQ1ZDBQTK=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Porção Mista 2': 'https://lh3.googleusercontent.com/A99qY2RMv90elT3jwPaX7Up4h6j1AwyeSwEC8PZgA1OVDdAVDlCAMUs6FVlYbKUdhRAph4K2YmXIANvpqV6Ee0e5B6WyiUWzVg=w612-h420-fcrop64=1,00005878ffffa787-nu-e365-rw',
  'Porção Mista 3': 'https://lh3.googleusercontent.com/AL8M2aLBt-6wCwNAcvjwnbxahwl-okBRCMksW7QZ4KyCgzGBgiquJdXkpo-2D3HjINZ51qURfKM17BzTYGSY0E_Bd7CBnnkHtw=w612-h420-fcrop64=1,00001b79ffffe486-nu-e365-rw',
  'Porção Mista 4': 'https://lh3.googleusercontent.com/1HMV-UU_G35j_PE_Mke8g8HqKOAKvBrJnm7ERWsQrU3yDh97IZNvVWqiQVizgXhz_8BET9DQG6rqHDw_nLBuXFklA-pu1bnGhQ=w612-h420-fcrop64=1,000056f3ffffdab6-nu-e365-rw',
  'Filé de Frango com Fritas': 'https://lh3.googleusercontent.com/ZA0D5HJIrKxLFx85n4rrYJciFqxMEOlYdO5oHGYKlp0MF3mDz0MuJxFMZNBFfNm0SHnvU0xh_RpKm5qEuv0l7RNKGlNKrYiqk=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  'Tilápia com Pão de Alho': 'https://lh3.googleusercontent.com/mghX1fqzMOmMk4VPSnFyIMGjfH5hJi8bB_EHdOQdqYknJZF5AGGJz5EFluQBON90gLEq3VdmmPgNPvpKPELFgKAJVz3qQkU=w612-h420-fcrop64=1,00001345c42ee952-nu-e365-rw',
}

async function main() {
  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } })
  if (!store) {
    console.error(`❌ Loja "${STORE_SLUG}" não encontrada.`)
    process.exit(1)
  }
  console.log(`✅ Loja encontrada: ${store.name}`)

  let updated = 0
  let notFound = 0

  for (const [name, imageUrl] of Object.entries(IMAGES)) {
    const result = await prisma.product.updateMany({
      where: { storeId: store.id, name },
      data: { imageUrl },
    })
    if (result.count === 0) {
      console.warn(`⚠️  Produto não encontrado: "${name}"`)
      notFound++
    } else {
      updated += result.count
    }
  }

  console.log(`\n✅ ${updated} produto(s) atualizado(s) com imagem.`)
  if (notFound > 0) console.log(`⚠️  ${notFound} nome(s) não encontrado(s) — verifique a grafia.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
