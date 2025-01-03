/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/transfer_hook.json`.
 */
export type TransferHook = {
  "address": "9DDVM9Un2wnhE3rjh11XV4LHraw422oK8NymjGpSPAxP",
  "metadata": {
    "name": "transferHook",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addToWhitelist",
      "discriminator": [
        157,
        211,
        52,
        54,
        144,
        81,
        5,
        55
      ],
      "accounts": [
        {
          "name": "newAccount"
        },
        {
          "name": "whiteList",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  104,
                  105,
                  116,
                  101,
                  95,
                  108,
                  105,
                  115,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "walletAccount",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initializeExtraAccountMetaList",
      "discriminator": [
        43,
        34,
        13,
        49,
        167,
        88,
        235,
        235
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "extraAccountMetaList",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  120,
                  116,
                  114,
                  97,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  45,
                  109,
                  101,
                  116,
                  97,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "whiteList",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  104,
                  105,
                  116,
                  101,
                  95,
                  108,
                  105,
                  115,
                  116
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "removeFromWhitelist",
      "discriminator": [
        7,
        144,
        216,
        239,
        243,
        236,
        193,
        235
      ],
      "accounts": [
        {
          "name": "accountToRemove",
          "docs": [
            "The token account you want to remove",
            "(and we might also need the wallet key as an arg too)",
            "/// CHECK: account_to_remove is a token account"
          ]
        },
        {
          "name": "whiteList",
          "writable": true
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "walletAccount",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "transferHook",
      "discriminator": [
        105,
        37,
        101,
        197,
        75,
        251,
        102,
        26
      ],
      "accounts": [
        {
          "name": "sourceToken"
        },
        {
          "name": "mint"
        },
        {
          "name": "destinationToken"
        },
        {
          "name": "owner"
        },
        {
          "name": "extraAccountMetaList",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  120,
                  116,
                  114,
                  97,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  45,
                  109,
                  101,
                  116,
                  97,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "whiteList",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  104,
                  105,
                  116,
                  101,
                  95,
                  108,
                  105,
                  115,
                  116
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "whiteList",
      "discriminator": [
        77,
        38,
        70,
        33,
        93,
        150,
        136,
        174
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "isNotCurrentlyTransferring",
      "msg": "The token is not currently transferring"
    },
    {
      "code": 6001,
      "name": "notWhitelistAuthority",
      "msg": "Only the whitelist authority can modify the whitelist"
    },
    {
      "code": 6002,
      "name": "walletAlreadyWhitelisted",
      "msg": "This (token_account, wallet_account) pair is already whitelisted"
    }
  ],
  "types": [
    {
      "name": "whiteList",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "whiteList",
            "type": {
              "vec": {
                "defined": {
                  "name": "whitelistEntry"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "whitelistEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenAccount",
            "type": "pubkey"
          },
          {
            "name": "walletAccount",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
