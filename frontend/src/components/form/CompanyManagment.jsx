import { useEffect, useState } from "react";
import CompanyProfile from "./CompanyProfileForm";
import { Modal } from "../../components/ui/modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../components/ui/table";
import { getCompanies } from "../../api";

const DataField = ({ label, value }) => (
  <div>
    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{label}</p>
    <p className="text-sm font-semibold text-gray-700">{value || "—"}</p>
  </div>
);

export default function CompanyManagement() {
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);

  /* 🔹 FETCH DATA */
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await getCompanies();
      setCompanies(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const displayCompany = selectedCompany
    ? (({ financial_year_start, financial_year_end, ...rest }) => ({
      ...rest,
      financial_year: `${financial_year_start} → ${financial_year_end}`,
    }))(selectedCompany)
    : null;


  return (
    <div className="max-w-7xl mx-auto p-4 mt-6 px-4 space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">
          Company Management
        </h1>
        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Create Company
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b text-sm font-medium text-gray-700">
          Company List
        </div>

        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader className="bg-gray-50 border-b">
              <TableRow>
                <TableCell isHeader className="px-6 py-4 font-semibold">
                  Company
                </TableCell>
                <TableCell isHeader className="px-6 py-4 font-semibold">
                  Login ID
                </TableCell>
                <TableCell isHeader className="px-6 py-4 font-semibold">
                  Financial Year
                </TableCell>

                <TableCell isHeader className="px-6 py-4 font-semibold">
                  Location
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-4 font-semibold text-right"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-gray-500"
                  >
                    No companies created yet
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow key={c.id} className="hover:bg-gray-50">
                    {/* COMPANY */}
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={
                            c.logo
                              ? `${import.meta.env.VITE_SERVER_URL}/${c.logo}`
                              : "/avatar-placeholder.png"
                          }
                          className="h-11 w-11 rounded-full border bg-white object-cover"
                        />
                        <div>
                          <p className="font-semibold text-gray-800">
                            {c.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {c.country || "-"}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* LOGIN ID */}
                    <TableCell className="px-6 py-4 text-gray-700">
                      {c.login_id}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-700">
                      {c.financial_year_start} → {c.financial_year_end}
                    </TableCell>

                    {/* LOCATION */}
                    <TableCell className="px-6 py-4 text-gray-700">
                      {[c.city, c.state].filter(Boolean).join(", ") || "-"}
                    </TableCell>

                    {/* ACTION */}
                    <TableCell className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedCompany(c);
                          setViewOpen(true);
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        View →
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        className="w-full max-w-4xl p-0 overflow-hidden shadow-2xl"
      >
        <CompanyProfile
          onSave={() => {
            fetchCompanies();
            setOpen(false);
          }}
        />
      </Modal>

      {/* VIEW MODAL */}
      <Modal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        className="w-full max-w-4xl p-0 overflow-hidden shadow-2xl rounded-3xl"
      >
        {selectedCompany && (
          <div className="bg-white flex flex-col max-h-[90vh]">
            {/* Header with Background Gradient */}
            <div className="relative h-32 bg-gradient-to-r from-[#FF4200] to-[#FF7A00] flex items-end px-8 pb-4">
              <div className="absolute top-4 right-4">
                <button 
                  onClick={() => setViewOpen(false)}
                  className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-all"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-5 translate-y-8">
                <div className="h-24 w-24 bg-white rounded-2xl shadow-xl border-4 border-white flex items-center justify-center overflow-hidden">
                  {selectedCompany.logo ? (
                    <img
                      src={`${import.meta.env.VITE_SERVER_URL}/${selectedCompany.logo}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="text-[#FF4200] font-bold text-3xl uppercase">{selectedCompany.name.substring(0, 1)}</div>
                  )}
                </div>
                <div className="pb-8">
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">{selectedCompany.name}</h2>
                  <div className="flex items-center gap-2 text-white/90 text-xs mt-1">
                    <span className="px-2 py-0.5 bg-white/20 rounded-full backdrop-blur-sm">ID: {selectedCompany.login_id}</span>
                    <span className="px-2 py-0.5 bg-white/20 rounded-full backdrop-blur-sm">Active Profile</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto mt-10 p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Left Column: Business & Tax Info */}
                <div className="md:col-span-2 space-y-8">
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-1 w-8 bg-[#FF4200] rounded-full"></div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Business Details</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-5">
                      <DataField label="Financial Year" value={`${selectedCompany.financial_year_start} to ${selectedCompany.financial_year_end}`} />
                      <DataField label="Country" value={selectedCompany.country} />
                      <DataField label="State" value={selectedCompany.state} />
                      <DataField label="City" value={selectedCompany.city} />
                      <div className="col-span-2">
                        <DataField label="Full Address" value={selectedCompany.address} />
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-1 w-8 bg-blue-600 rounded-full"></div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tax & Regulatory</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-5">
                      <DataField label="GST Number" value={selectedCompany.gst_number} />
                      <DataField label="PAN Number" value={selectedCompany.pennumber} />
                      <DataField label="GST State Code" value={selectedCompany.gst_state_code} />
                      <DataField label="GST Status" value={selectedCompany.gst_enabled ? "Enabled" : "Disabled"} />
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-1 w-8 bg-emerald-600 rounded-full"></div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Overview</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-5">
                      <DataField label="Opening Balance" value={`₹ ${selectedCompany.opening_balance}`} />
                      <DataField label="Balance Type" value={selectedCompany.balance_type} />
                      <DataField label="Opening Date" value={selectedCompany.opening_date} />
                    </div>
                  </section>
                </div>

                {/* Right Column: Contact & Branding */}
                <div className="space-y-8 border-l pl-8">
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Info</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">✉</div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Email</p>
                          <p className="text-sm font-semibold text-gray-700">{selectedCompany.email || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">📞</div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Phone</p>
                          <p className="text-sm font-semibold text-gray-700">{selectedCompany.contact_no || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Branding</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Authorized Signature</p>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
                          {selectedCompany.signature ? (
                            <img
                              src={`${import.meta.env.VITE_SERVER_URL}/${selectedCompany.signature}`}
                              className="max-h-24 w-full object-contain mix-blend-multiply"
                            />
                          ) : (
                            <p className="text-xs text-gray-400 italic py-4 text-center">No signature uploaded</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-between items-center px-8">
              <p className="text-xs text-gray-400">Created at: {new Date(selectedCompany.created_at).toLocaleDateString()}</p>
              <button
                onClick={() => setViewOpen(false)}
                className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
