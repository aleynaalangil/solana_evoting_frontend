/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/token_contract.json`.
 */
export type TokenContract = {
  "address": "CXj7nfvYzeKpt8LptsEmqThscv79ShAN9nLeopJvYKgz",
  "metadata": {
    "name": "tokenContract",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addShareholderByCompany",
      "docs": [
        "Add a new Shareholder by creating a \"Shareholder\" account (one-PDA-per-shareholder)."
      ],
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
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  97,
                  114,
                  101,
                  104,
                  111,
                  108,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "shareholderPk"
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
      "docs": [
        "Delegate vote rights by changing the `owner` on the Shareholder account",
        "(and maybe adjusting voting_power)."
      ],
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
      "docs": [
        "Finish the poll. If there's a tie among multiple top options, create a new poll",
        "containing only those tied options."
      ],
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
          "name": "oldPoll",
          "writable": true
        },
        {
          "name": "tieBreakPoll",
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
      "args": []
    },
    {
      "name": "initializeCompany",
      "docs": [
        "Initialize the Company with name, symbol, total supply, etc."
      ],
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
      "docs": [
        "Create a poll with a list of `options`."
      ],
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
          "name": "options",
          "type": {
            "vec": "string"
          }
        }
      ]
    },
    {
      "name": "removeShareholderByCompany",
      "docs": [
        "Remove a Shareholder by closing the Shareholder account."
      ],
      "discriminator": [
        202,
        149,
        2,
        25,
        200,
        153,
        128,
        91
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
      "name": "vote",
      "docs": [
        "Cast a vote.",
        "- Each user that votes must create a unique `VoteRecord` to prove they haven't voted yet."
      ],
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
          "name": "voter",
          "writable": true,
          "signer": true
        },
        {
          "name": "voteRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  45,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "poll"
              },
              {
                "kind": "account",
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "voteId",
          "type": "u8"
        },
        {
          "name": "votingPower",
          "type": "u64"
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
    },
    {
      "name": "voteRecord",
      "discriminator": [
        112,
        9,
        123,
        165,
        234,
        9,
        157,
        167
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "pollAlreadyFinished",
      "msg": "Poll is already finished"
    },
    {
      "code": 6001,
      "name": "pollOptionNotFound",
      "msg": "Poll option not found"
    },
    {
      "code": 6002,
      "name": "overflow",
      "msg": "Arithmetic overflow"
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
            "name": "id",
            "type": "u8"
          },
          {
            "name": "label",
            "type": "string"
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
    },
    {
      "name": "voteRecord",
      "docs": [
        "Each user must create a VoteRecord with seeds = [b\"vote-record\", pollPubkey, userPubkey]",
        "to ensure they do not vote twice."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poll",
            "type": "pubkey"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "votedOption",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
