/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/token_contract.json`.
 */
export type TokenContract = {
  "address": "Ajf6V1JscbNyFc5zyhm3DvDcZrNeqMvYsji2CrKvsum1",
  "metadata": {
    "name": "tokenContract",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addShareholderByCompany",
      "discriminator": [
        61,
        197,
        180,
        213,
        28,
        95,
        80,
        147
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true
        },
        {
          "name": "shareholder",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
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
          "name": "shareholderPk",
          "type": "pubkey"
        },
        {
          "name": "votingPower",
          "type": "u128"
        }
      ]
    },
    {
      "name": "delegateVoteRights",
      "discriminator": [
        112,
        73,
        192,
        176,
        139,
        0,
        3,
        125
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true
        },
        {
          "name": "shareholder",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
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
          "name": "newDelegatedTo",
          "type": "pubkey"
        },
        {
          "name": "shareholderVotingPower",
          "type": "u128"
        },
        {
          "name": "company",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "finishPoll",
      "discriminator": [
        78,
        50,
        124,
        63,
        206,
        128,
        10,
        182
      ],
      "accounts": [
        {
          "name": "poll",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "initializeCompany",
      "discriminator": [
        75,
        156,
        55,
        94,
        184,
        64,
        58,
        30
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  112,
                  97,
                  110,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "totalSupply",
          "type": "u128"
        },
        {
          "name": "tokenMint",
          "type": "pubkey"
        },
        {
          "name": "treasury",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initializePoll",
      "discriminator": [
        193,
        22,
        99,
        197,
        18,
        33,
        115,
        117
      ],
      "accounts": [
        {
          "name": "poll",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
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
          "name": "options",
          "type": {
            "vec": "string"
          }
        }
      ]
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
          "name": "company",
          "writable": true,
          "relations": [
            "shareholder"
          ]
        },
        {
          "name": "shareholder",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "company"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "tallyVotes",
      "discriminator": [
        144,
        82,
        0,
        72,
        160,
        132,
        35,
        121
      ],
      "accounts": [
        {
          "name": "poll",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "vote",
      "discriminator": [
        227,
        110,
        155,
        23,
        136,
        126,
        172,
        25
      ],
      "accounts": [
        {
          "name": "poll",
          "writable": true
        },
        {
          "name": "shareholder",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "shareholder"
          ]
        }
      ],
      "args": [
        {
          "name": "voteId",
          "type": "u8"
        },
        {
          "name": "shareholderOwner",
          "type": "pubkey"
        },
        {
          "name": "shareholderVotingPower",
          "type": "u128"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "company",
      "discriminator": [
        32,
        212,
        52,
        137,
        90,
        7,
        206,
        183
      ]
    },
    {
      "name": "poll",
      "discriminator": [
        110,
        234,
        167,
        188,
        231,
        136,
        153,
        111
      ]
    },
    {
      "name": "shareholder",
      "discriminator": [
        93,
        254,
        55,
        138,
        251,
        186,
        195,
        3
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "You are not the company authority"
    },
    {
      "code": 6001,
      "name": "underflow",
      "msg": "Shareholder count underflow"
    }
  ],
  "types": [
    {
      "name": "company",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "totalSupply",
            "type": "u128"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "shareholderCount",
            "type": "u32"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "poll",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "options",
            "type": {
              "vec": {
                "defined": {
                  "name": "pollOption"
                }
              }
            }
          },
          {
            "name": "voters",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "finished",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "pollOption",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "label",
            "type": "string"
          },
          {
            "name": "id",
            "type": "u8"
          },
          {
            "name": "votes",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "shareholder",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "votingPower",
            "type": "u128"
          },
          {
            "name": "company",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
