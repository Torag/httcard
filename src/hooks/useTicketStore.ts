import { useState, useEffect } from 'react';
import { TicketData } from '../types';
import { getTickets, saveTicketRecord, saveMultipleTicketRecords, deleteTicketsRecords, deleteTicketRecord } from '../services/storage';

export function useTicketStore() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const loadedTickets = getTickets();
      setTickets(loadedTickets);
    } catch (e: any) {
      console.error('Failed to load tickets from central storage', e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTicket = async (ticket: TicketData) => {
    try {
      const updatedTickets = saveTicketRecord(ticket);
      setTickets(updatedTickets);
      const savedTicket = updatedTickets.find((t) => t.id === ticket.id) || ticket;
      return savedTicket;
    } catch (e: any) {
      console.error('Failed to save ticket to central storage', e.message || 'Unknown error');
      throw e;
    }
  };

  const deleteTickets = async (ids: string[]) => {
    try {
      const updatedTickets = deleteTicketsRecords(ids);
      setTickets(updatedTickets);
    } catch (e: any) {
      console.error('Failed to delete tickets from central storage', e.message || 'Unknown error');
      throw e;
    }
  };

  const deleteTicket = async (id: string) => {
    try {
      const updatedTickets = deleteTicketRecord(id);
      setTickets(updatedTickets);
    } catch (e: any) {
      console.error('Failed to delete ticket from central storage', e.message || 'Unknown error');
      throw e;
    }
  };

  const saveMultipleTickets = async (ticketsToSave: TicketData[]) => {
    try {
      const updatedTickets = saveMultipleTicketRecords(ticketsToSave);
      setTickets(updatedTickets);
      return updatedTickets;
    } catch (e: any) {
      console.error('Failed to save multiple tickets to central storage', e.message || 'Unknown error');
      throw e;
    }
  };

  const refreshTickets = () => {
    setTickets(getTickets());
  };

  return { tickets, loading, saveTicket, saveMultipleTickets, deleteTicket, deleteTickets, refreshTickets };
}

