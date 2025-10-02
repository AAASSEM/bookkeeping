import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dbService, migrateFromLocalStorage } from '@/db/database';

export const DatabaseTest = () => {
  const [status, setStatus] = useState('Not started');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const runMigration = async () => {
    try {
      setStatus('Migrating from localStorage...');
      await migrateFromLocalStorage();
      setStatus('Migration completed!');
      await loadData();
    } catch (error) {
      setStatus(`Migration error: ${error}`);
    }
  };

  const loadData = async () => {
    try {
      setStatus('Loading data from IndexedDB...');
      const [txns, inv, prtrs, sett] = await Promise.all([
        dbService.getAllTransactions(),
        dbService.getAllInventory(),
        dbService.getAllPartners(),
        dbService.getSettings()
      ]);

      setTransactions(txns);
      setInventory(inv);
      setPartners(prtrs);
      setSettings(sett);
      setStatus('Data loaded successfully!');
    } catch (error) {
      setStatus(`Load error: ${error}`);
    }
  };

  const clearDatabase = async () => {
    try {
      setStatus('Clearing database...');
      await dbService.clearAllData();
      setStatus('Database cleared!');
      setTransactions([]);
      setInventory([]);
      setPartners([]);
      setSettings(null);
    } catch (error) {
      setStatus(`Clear error: ${error}`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Database Test Page</h1>

      <div className="flex gap-4 mb-6">
        <Button onClick={runMigration}>Migrate from localStorage</Button>
        <Button onClick={loadData}>Load Data</Button>
        <Button onClick={clearDatabase} variant="destructive">Clear Database</Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono">{status}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Transactions ({transactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="text-sm mb-2 p-2 bg-gray-100 rounded">
                  <div><strong>{t.type}</strong> - ${t.amount}</div>
                  <div className="text-gray-600">{t.description}</div>
                </div>
              ))}
              {transactions.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">... and {transactions.length - 5} more</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory ({inventory.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto">
              {inventory.map((item) => (
                <div key={item.id} className="text-sm mb-2 p-2 bg-gray-100 rounded">
                  <div><strong>{item.name}</strong></div>
                  <div className="text-gray-600">Qty: {item.quantity} | Value: ${item.totalValue}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Partners ({partners.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto">
              {partners.map((p) => (
                <div key={p.id} className="text-sm mb-2 p-2 bg-gray-100 rounded">
                  <div><strong>{p.name}</strong></div>
                  <div className="text-gray-600">Capital: ${p.capital}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {settings && (
              <div className="text-sm">
                <div>Dark Mode: {settings.darkMode ? 'Yes' : 'No'}</div>
                <div>Language: {settings.language}</div>
                <div>Cash: ${settings.cash}</div>
                <div>Total Sales: ${settings.totalSales}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
