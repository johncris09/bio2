import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";

import "bootstrap/dist/css/bootstrap.min.css";
import "./css/custom.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";
const api = axios.create({
  baseURL: "http://localhost/project/biometric/api/",
});

const App = () => {
  const [data, setData] = useState([]); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await api
      .get("biometric")
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {
        console.info(error);
        // toast.error(handleError(error))
      });
  };
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // Specify the sheet name you want to read
      const sheetName = "Attend. Logs";
      const worksheet = workbook.Sheets[sheetName];

      // Convert the selected sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Implement adjustment algorithm
      const adjustedData = adjustTimes(jsonData); // Implement this function

      const unmodefiedData = saveToUnmodified(adjustedData);
    };

    reader.readAsArrayBuffer(file);
  };
  const adjustTimes = (data) => {
    let empLog = [];
    let startDate = "";
    let endDate = "";
    let dateRange = [];
    let yearMonth = "";
    data.forEach((log, index) => {
      const row = log;
      // console.info(row)
      if (row.includes("Date :")) {
        const dateRange = row[row.indexOf("Date :") + 2];
        [startDate, endDate] = dateRange.split(" ~ ");
        yearMonth = new Date(startDate).toISOString().slice(0, 7);
      }
      if (row.includes("Name :")) {
        const employeeId = row[row.indexOf("ID :") + 2];
        const employeeName = row[row.indexOf("Name :") + 2];
        const employeeDept = row[row.indexOf("Dept. :") + 2];

        empLog.push({
          employeeId,
          employeeName,
          employeeDept,
          startDate,
          endDate,
          logs: {},
        });

        const logsIndex = index;
        if (logsIndex < data.length) {
          const logs = data[logsIndex];
          const datesIndex = index + 5;
          const timesIndex = index + 1;
          // console.info(logs, datesIndex -2, timesIndex-2);
          // Check if logs exist for the employee
          if (logs && datesIndex < data.length && timesIndex < data.length) {
            const dates = data[datesIndex];
            const times = data[timesIndex];

            // Loop through the dates and times to populate the logs
            for (let j = 0; j < dates.length; j++) {
              const date = dates[j];
              const time = times[j];
              if (date !== undefined && time !== undefined) {
                // Split the time into logged in and logged out times
                const loggedTime = time.trim().split("\n");

                // Add the loggedTime to the existing logs for the employee
                const empIndex = empLog.length - 1;
                const logsCount = Object.keys(empLog[empIndex].logs).length;
                empLog[empIndex].logs[logsCount] = {
                  date: formatDateString(yearMonth + "-" + date),
                  loggedTime,
                };
              }
            }
          }
        }
      }
    });
    console.info(empLog);
    return empLog;
  };

  const saveToUnmodified = async (data) => {
    await api
      .post("biometric/insertToUnmodified", data)
      .then((response) => {
        // console.info(response.data);

        fetchData();
      })
      .catch((error) => {
        console.info(error);
      });
  };
  const clearTable = async () => {
    await api
      .post("biometric/clear_table")
      .then((response) => {
        console.info("table cleared");
        fetchData();
      })
      .catch((error) => {
        console.info(error);
      });
  };

  function formatDateString(dateString) {
    const dateParts = dateString.split("-");
    const year = dateParts[0];
    const month = dateParts[1].padStart(2, "0"); // Ensure month is two digits
    const day = dateParts[2].padStart(2, "0"); // Ensure day is two digits

    return `${year}-${month}-${day}`;
  }

  return (
    <>
      <div className="container">
        <div className="my-2">
          <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls" />
        </div>
        <div className="my-2">
          <button className="btn btn-outline-danger" onClick={clearTable}>
            <FontAwesomeIcon icon={faTrashAlt} /> Clear Data
          </button>
        </div>

        <hr />
        {data.map((row, index) => (
          <div key={index}>
            <h2>
              {row.name} | {row.department}
            </h2>
            <table>
              <tr>
                <td>Date</td>
                <td>Login</td>
                <td>Logout</td>
              </tr>
              <tbody>
                {Object.values(row.logs).map((row, index) => (
                  <tr key={index}>
                    <td>{row.date}</td>
                    <td>{row.login}</td>
                    <td>{row.logout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
};

export default App;
