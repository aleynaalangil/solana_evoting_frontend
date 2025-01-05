/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/transfer_hook.json`.
 */
export type TransferHook = {
  "address": "FTYJzS4zX9puYkmGE23zgtSkghLcjHeF6dYVoUabxpPk",
  "metadata": {
    "name": "transferHook",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addShareholder",
      "discriminator": [
        245,
        200,
        91,
        102,
        184,
        107,
        29,
        188
      ],
      "accounts": [
        {
          "name": "newShareholderWhitelist",
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
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "wallet"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "wallet",
          "type": "pubkey"
        },
        {
          "name": "tokenAccount",
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
        }
      ],
      "args": []
    },
    {
      "name": "removeShareholder",
      "discriminator": [
        66,
        175,
        86,
        173,
        126,
        193,
        86,
        239
      ],
      "accounts": [
        {
          "name": "shareholderWhitelist",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "shareholderWhitelist"
          ]
        }
      ],
      "args": []
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
      "name": "shareholderWhitelist",
      "discriminator": [
        57,
        33,
        117,
        211,
        219,
        212,
        200,
        153
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "isNotCurrentlyTransferring",
      "msg": "Not currently transferring"
    }
  ],
  "types": [
    {
      "name": "shareholderWhitelist",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "tokenAccount",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
