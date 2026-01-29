export const WORK_LOG_CONFIG = {
    ACCOUNT: {
        title: "Account Daily Report",
        tables: [
            {
                label: "Work Log",
                fields: [
                    { name: "work", label: "Work", type: "text" },
                    { name: "remark", label: "Remarks", type: "text" }
                ]
            }
        ]
    },
    "LEAD-OPERATION": {
        title: "Lead Operation Daily Report",
        tables: [
            {
                label: "Daily Tasks",
                fields: [
                    { name: "description", label: "Description", type: "text" },
                    { name: "remarks", label: "Remarks", type: "text" }
                ]
            }
        ]
    },
    "LEAD-CONVERSION": {
        title: "Lead Conversion Daily Report",
        tables: [
            {
                label: "Conversion Updates",
                fields: [
                    { name: "description", label: "Description", type: "text" },
                    { name: "count", label: "Count", type: "number" },
                    { name: "remarks", label: "Remarks", type: "text" }
                ]
            }
        ]
    },
    "DIGITAL-MARKETING": {
        title: "Digital Marketing Report",
        tables: [
            {
                label: "Campaign/Task Details",
                fields: [
                    { name: "work", label: "Work", type: "text" },
                    { name: "work_given_by", label: "Work Given By", type: "text" },
                    { name: "hours_spent", label: "Hours Spent", type: "number" },
                    { name: "status", label: "Status", type: "select", options: ["Pending", "In Progress", "Completed"] }
                ]
            }
        ]
    },
    "VENDOR-MANAGEMENT": {
        title: "Vendor Management Report",
        tables: [
            {
                label: "Vendor Tasks",
                fields: [
                    { name: "task", label: "Task", type: "text" },
                    { name: "status", label: "Status", type: "select", options: ["Pending", "In Progress", "Completed"] },
                    { name: "remarks", label: "Remarks", type: "text" },
                    { name: "bh_works", label: "BH Works", type: "text" }
                ]
            }
        ]
    },
    "CUSTOMER-RELATIONSHIP": {
        title: "Customer Relationship Report",
        tables: [
            {
                label: "Schedule & Visits",
                fields: [
                    { name: "name", label: "Client Name", type: "text" },
                    { name: "schedule", label: "Schedule", type: "text" },
                    { name: "work", label: "Work", type: "text" },
                    { name: "status", label: "Status", type: "select", options: ["Pending", "Visited", "Postponed"] },
                    { name: "sr_visit_status", label: "Today's SR Visit Status", type: "text" }
                ]
            },
            {
                label: "General Work",
                fields: [
                    { name: "description", label: "Description", type: "text" },
                    { name: "status", label: "Status", type: "text" },
                    { name: "remarks", label: "Remarks", type: "text" }
                ]
            }
        ]
    },
    "CLIENT-CARE": {
        title: "Client Care Daily Report",
        tables: [
            {
                label: "Tasks & Tickets",
                fields: [
                    { name: "description", label: "Description", type: "text" },
                    { name: "count", label: "Count", type: "number" },
                    { name: "remarks", label: "Remarks", type: "text" }
                ]
            }
        ]
    },
    ESCALATION: {
        title: "Escalation Report",
        tables: [
            {
                label: "Escalation Details",
                fields: [
                    { name: "description", label: "Description", type: "text" },
                    { name: "count", label: "Count", type: "number" },
                    { name: "remarks", label: "Remarks", type: "text" }
                ]
            }
        ]
    }
};
