import React, { createContext, useContext } from 'react';

const SettingsHeaderInsetContext = createContext(0);

export function SettingsHeaderInsetProvider({
  value,
  children,
}: {
  value: number;
  children: React.ReactNode;
}) {
  return (
    <SettingsHeaderInsetContext.Provider value={value}>{children}</SettingsHeaderInsetContext.Provider>
  );
}

export function useSettingsHeaderInset() {
  return useContext(SettingsHeaderInsetContext);
}
