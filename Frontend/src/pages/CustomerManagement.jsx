import {
  Plus,
  Search,
  Filter,
  Mail,
  MapPin,
  Building2,
  ShieldCheck,
  Users,
  Key,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import CustomerRegister from "../components/Forms/CustomerRegister";
import { customerAPI } from "../utils/api";

function CustomerManagement() {
  const [customerRegistrationForm, setCustomerRegistrationForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getCustomers();
      setCustomers(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCustomer = useCallback(async (customerId) => {
    try {
      const confirmed = window.confirm("Do you want to delete this customer? This action cannot be undone.");
      if (!confirmed) return;
      await customerAPI.deleteCustomer(customerId);
      setCustomers((prevCustomers) =>
        prevCustomers.filter((customer) => customer.id !== customerId)
      );
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  }, []);


  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const query = searchTerm.toLowerCase();
    return customers.filter((customer) =>
      [
        customer?.name,
        customer?.email,
        customer?.plotNumber,
        customer?.siteName,
        String(customer?.id ?? ""),
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [customers, searchTerm]);

  const totalCustomers = customers.length;
  const credentialsIssued = customers.filter((customer) => customer?.password)
    .length;
  const siteCount = new Set(
    customers.map((customer) => customer?.siteName).filter(Boolean)
  ).size;
  const plotsAssigned = customers.filter((customer) => customer?.plotNumber)
    .length;

  const summaryCards = [
    {
      label: "Total customers",
      value: totalCustomers,
      description: "Profiles in the CRM",
      icon: Users,
      iconClass: "text-primary-600",
      iconBg: "bg-primary-100",
    },
    {
      label: "Credentials issued",
      value: credentialsIssued,
      description: "Portal access ready",
      icon: ShieldCheck,
      iconClass: "text-green-600",
      iconBg: "bg-green-100",
    },
    {
      label: "Sites covered",
      value: siteCount,
      description: "Active communities",
      icon: Building2,
      iconClass: "text-orange-600",
      iconBg: "bg-orange-100",
    },
    {
      label: "Plots assigned",
      value: plotsAssigned,
      description: "Mapped to customers",
      icon: MapPin,
      iconClass: "text-sky-600",
      iconBg: "bg-sky-100",
    },
  ];

  const getAccessBadge = (hasPassword) =>
    hasPassword ? "badge-success" : "badge-warning";
  const getAccessLabel = (hasPassword) =>
    hasPassword ? "Issued" : "Pending";

  return (
    <div className="relative space-y-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-sky-50" />
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
      </div>

      <section className="card border border-slate-200 bg-white">
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.35em] text-primary-600">
                Customer Management
              </p>
              <h1 className="mt-2 text-2xl md:text-3xl font-bold text-slate-900">
                Keep customer records crisp and current
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Add new customers, verify plot details, and share login
                credentials securely across teams.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-primary-500" />
                {totalCustomers} total customers
              </div>
              <button
                onClick={() => setCustomerRegistrationForm(true)}
                className="flex items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                Add Customer
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {card.description}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${card.iconBg}`}
                  >
                    <card.icon className={`h-5 w-5 ${card.iconClass}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Customer Directory
            </h2>
            <p className="text-sm text-slate-500">
              Showing {filteredCustomers.length} of {totalCustomers} customers
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search by name, email, plot..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <button className="flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100">
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
              Loading customers...
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-lg font-semibold text-slate-900">
              No customers found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try a different search term or add a new customer.
            </p>
            <button
              onClick={() => setCustomerRegistrationForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </button>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Plot
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Site
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Credentials
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Access
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-t border-slate-100 transition hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {customer.name || "Unnamed customer"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {customer.email || "Email not provided"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {customer.plotNumber || "Plot not assigned"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {customer.siteName || "Site not assigned"}
                        </td>
                        <td className="px-4 py-3">
                          {customer.password ? (
                            <div className="inline-flex items-center gap-2">
                              <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                                {customer.password}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Not set
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`badge ${getAccessBadge(
                              customer.password
                            )}`}
                          >
                            {getAccessLabel(customer.password)}
                          </span>
                        </td>
                        <td className="px-4 py-3 "><button onClick={() => deleteCustomer(customer.id)}><Trash2 className="text-red-600 hover:text-red-700 hover:cursor-pointer hover:scale-110 transition-transform duration-200 bg-gray-200 p-1.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 p-4 md:hidden">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">
                        Customer {customer.id}
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        {customer.name || "Unnamed customer"}
                      </p>
                    </div>
                    <span
                      className={`badge ${getAccessBadge(customer.password)}`}
                    >
                      {getAccessLabel(customer.password)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary-500" />
                      <span className="truncate">
                        {customer.email || "Email not provided"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary-500" />
                      <span>{customer.plotNumber || "Plot not assigned"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary-500" />
                      <span>{customer.siteName || "Site not assigned"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary-500" />
                      <span>
                        {customer.password || "Credentials not set"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {customerRegistrationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setCustomerRegistrationForm(false)}
          />
          <div className="relative z-10 w-full max-w-lg">
            <CustomerRegister
              setCustomerRegistrationForm={setCustomerRegistrationForm}
              onCustomerCreated={fetchCustomers}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerManagement;
