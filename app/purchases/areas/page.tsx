"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Plus, Trash2, Search, Pencil, Check, X } from "lucide-react";

interface BookingArea {
  id: string;
  name: string;
  created_at: string;
}

export default function BookingAreasPage() {
  const [areas, setAreas] = useState<BookingArea[]>([]);
  const [newAreaName, setNewAreaName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("booking_areas")
      .select("*")
      .order("name", { ascending: true });

    if (data) setAreas(data);
    if (error) console.error("Error fetching areas:", error.message);
    setLoading(false);
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    setSaving(true);
    const { error } = await supabase
      .from("booking_areas")
      .insert([{ name: newAreaName.trim() }]);

    if (error) {
      alert("Error adding area (maybe already exists): " + error.message);
    } else {
      setNewAreaName("");
      fetchAreas();
    }
    setSaving(false);
  };

  const startEditing = (area: BookingArea) => {
    setEditingId(area.id);
    setEditValue(area.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleUpdateArea = async (id: string, oldName: string) => {
    const trimmedNewName = editValue.trim();
    if (!trimmedNewName) {
      alert("Area name khali nahi ho sakta!");
      return;
    }

    if (trimmedNewName === oldName) {
      cancelEditing();
      return;
    }

    setUpdating(true);
    try {
      // 1. booking_areas table mein naam update karein
      const { error: areaError } = await supabase
        .from("booking_areas")
        .update({ name: trimmedNewName })
        .eq("id", id);

      if (areaError) throw areaError;

      // 2. Purani purchase_items aur supplier_ledger entries mein bhi area name sync karein
      await Promise.all([
        supabase
          .from("purchase_items")
          .update({ booking_area: trimmedNewName })
          .eq("booking_area", oldName),
        supabase
          .from("supplier_ledger")
          .update({ booking_area: trimmedNewName })
          .eq("booking_area", oldName),
      ]);

      cancelEditing();
      fetchAreas();
    } catch (err: any) {
      alert("Error updating area: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteArea = async (id: string, name: string) => {
    if (!window.confirm(`Kya aap "${name}" ko delete karna chahte hain?`)) return;

    const { error } = await supabase.from("booking_areas").delete().eq("id", id);
    if (error) {
      alert("Error deleting area: " + error.message);
    } else {
      fetchAreas();
    }
  };

  const filteredAreas = areas.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-600" /> Booking Areas Management
        </h1>
        <p className="text-sm text-slate-500">
          Add, edit, or manage delivery / booking routes. Editing an area automatically updates past ledger & purchase records.
        </p>
      </div>

      {/* Add New Area Form */}
      <form
        onSubmit={handleAddArea}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          required
          placeholder="Enter new booking area (e.g. Qadirabad, Phalia)..."
          value={newAreaName}
          onChange={(e) => setNewAreaName(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {saving ? "Adding..." : "Add Booking Area"}
        </button>
      </form>

      {/* Areas List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Total Areas: {filteredAreas.length}
          </span>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 w-16">#</th>
              <th className="px-4 py-3">Booking Area / Route Name</th>
              <th className="px-4 py-3 text-center w-36">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  Loading areas...
                </td>
              </tr>
            ) : filteredAreas.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  No booking areas found.
                </td>
              </tr>
            ) : (
              filteredAreas.map((area, index) => {
                const isEditing = editingId === area.id;
                return (
                  <tr key={area.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 font-medium">{index + 1}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateArea(area.id, area.name);
                            if (e.key === "Escape") cancelEditing();
                          }}
                          autoFocus
                          className="w-full max-w-sm px-3 py-1.5 border border-blue-400 rounded-md text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      ) : (
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-500" /> {area.name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleUpdateArea(area.id, area.name)}
                            disabled={updating}
                            className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md transition disabled:opacity-50"
                            title="Save Changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={updating}
                            className="p-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-md transition"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => startEditing(area)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                            title="Edit Area Name"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteArea(area.id, area.name)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition"
                            title="Delete Area"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}