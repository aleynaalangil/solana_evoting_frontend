import React, { createContext, useContext, useState, FC } from 'react';
import { PublicKey } from '@solana/web3.js';

interface MintContextType {
  mintPubkey: PublicKey | null;
  setMintPubkey: (pubkey: PublicKey | null) => void;
}

const MintContext = createContext<MintContextType | undefined>(undefined);

export const MintProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  // We store the mint (as a PublicKey or null if not set yet)
  const [mintPubkey, setMintPubkey] = useState<PublicKey | null>(null);

  return (
    <MintContext.Provider value={{ mintPubkey, setMintPubkey }}>
      {children}
    </MintContext.Provider>
  );
};

export const useMintContext = (): MintContextType => {
  const context = useContext(MintContext);
  if (!context) {
    throw new Error("useMintContext must be used within a MintProvider");
  }
  return context;
};
