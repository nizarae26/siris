import React from 'react';
import { ScanLog } from '../app/api/rfid/database';

interface LogTrackerProps {
  logs: ScanLog[];
}

export default function LogTracker({ logs }: LogTrackerProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 w-full h-full border border-gray-100">
      <h2 className="text-xl font-bold mb-5 text-gray-800 border-b pb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Recent Scans
      </h2>
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <p className="italic text-sm">No scans recorded yet</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="p-4 rounded-xl border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-800 truncate pr-2">{log.name}</span>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full flex-shrink-0 ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {log.status}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                <span className="bg-gray-100 px-2 py-0.5 rounded-md">{log.role}</span>
                <span className="flex items-center gap-1">
                  {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
