import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import "./fonts/Recoleta-RegularDEMO.otf";
import "bootstrap/dist/css/bootstrap.min.css";
import "./css/custom.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  PDFViewer,
  Font,
  Line,
  Svg,
} from "@react-pdf/renderer";
const api = axios.create({
  baseURL: "http://localhost/project/biometric/api/",
});

const App = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    // fetchData();
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
      const sheetName = "bio";
      const worksheet = workbook.Sheets[sheetName];

      // Convert the selected sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Implement adjustment algorithm
      const adjustedData = adjustTimes(jsonData); // Implement this function

      const _modifyLog = modifyLog(adjustedData);
      setData(_modifyLog);
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
          // Check if logs exist for the employee
          if (logs && datesIndex < data.length && timesIndex < data.length) {
            const dates = data[datesIndex];
            const times = data[timesIndex];
            let type = "login";
            // Loop through the dates and times to populate the logs
            for (let j = 0; j < dates.length; j++) {
              const date = dates[j];
              const time = times[j];
              if (date !== undefined && time !== undefined) {
                // Split the time into logged in and logged out times
                const loggedTime = time.trim().split("\n");

                loggedTime.forEach((row) => {
                  const empIndex = empLog.length - 1;
                  const logsCount = Object.keys(empLog[empIndex].logs).length;
                  empLog[empIndex].logs[logsCount] = {
                    date: formatDateString(yearMonth + "-" + date),
                    type: type,
                    time: row,
                  };
                  type = type === "login" ? "logout" : "login";
                });
              }
            }
          }
        }
      }
    });
    return empLog;
  };

  function findLogIndex(date, type, logsArray) {
    for (let i = 0; i < Object.keys(logsArray).length; i++) {
      if (
        logsArray[Object.keys(logsArray)[i]].date === date &&
        logsArray[Object.keys(logsArray)[i]].type === type
      ) {
        return i; // Return the index if date and type match
      }
    }
    return -1; // Return -1 if not found
  }

  const modifyLog = (data) => {
    let empLog = [];
    data.forEach((row, index) => {
      const {
        employeeDept,
        employeeName,
        endDate,
        startDate,
        employeeId,
        logs,
      } = row;
      const start = new Date(startDate);
      const end = new Date(endDate);

      empLog.push({
        employeeId,
        employeeName,
        employeeDept,
        startDate,
        endDate,
        _logs: [],
      });

      if (Object.keys(logs).length > 0) {
        let _startDate = new Date(startDate);
        let _endDate = new Date(endDate);
        while (_startDate <= _endDate) {
          const date = _startDate.toISOString().split("T")[0];

          const empIndex = empLog.length - 1;
          const logsCount = Object.keys(empLog[empIndex]._logs).length;

          empLog[empIndex]._logs[logsCount] = {
            date: date,
            _time: {},
          };

          let type = "login";
          let loginTime = "";
          let logoutTime = "";
          for (let i = 0; i < 2; i++) {
            const index = findLogIndex(date, type, logs);
            if (index > -1) {
              if (type === "login") {
                empLog[empIndex]._logs[logsCount]._time[type] =
                  logs[index].time; // Set initial value
              } else {
                empLog[empIndex]._logs[logsCount]._time[type] =
                  logs[index].time; // Set initial value
              }
            } else {
              if (type === "login") {
                loginTime = ""; // Reset login time
                empLog[empIndex]._logs[logsCount]._time[type] = ""; // Set initial value
              } else {
                logoutTime = ""; // Reset logout time
                empLog[empIndex]._logs[logsCount]._time[type] = ""; // Set initial value
              }
            }

            type = type === "login" ? "logout" : "login";
          }
          _startDate.setDate(_startDate.getDate() + 1);
        }
      } else {
        for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
          const dateString = date.toISOString().slice(0, 10);

          const empIndex = empLog.length - 1;
          const logsCount = Object.keys(empLog[empIndex]._logs).length;

          empLog[empIndex]._logs[logsCount] = {
            date: dateString,
            _time: {},
          };
          let type = "login";
          let loginTime = "";
          let logoutTime = "";
          for (let i = 0; i < 2; i++) {
            if (type === "login") {
              loginTime = ""; // Reset login time
              empLog[empIndex]._logs[logsCount]._time[type] = ""; // Set initial value
            } else {
              logoutTime = ""; // Reset logout time
              empLog[empIndex]._logs[logsCount]._time[type] = ""; // Set initial value
            }

            type = type === "login" ? "logout" : "login";
          }
        }
      }
    });
    return empLog;
  };

  function formatDateString(dateString) {
    const dateParts = dateString.split("-");
    const year = dateParts[0];
    const month = dateParts[1].padStart(2, "0"); // Ensure month is two digits
    const day = dateParts[2].padStart(2, "0"); // Ensure day is two digits

    return `${year}-${month}-${day}`;
  }

  // Font.register({
  //   family: "Roboto",
  //   fonts: [
  //     {
  //       src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
  //     },
  //     {
  //       src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
  //       fontWeight: "bolder",
  //     },
  //   ],
  // });

  Font.register({
    family: "Roboto Bold",
    fonts: [
      {
        src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
        fontStyle: "normal",
        fontWeight: "bold",
      },
    ],
  });
  const styles = StyleSheet.create({
    page: {
      flexDirection: "row",
      justifyContent: "space-between", // Evenly distribute columns horizontally
      paddingHorizontal: 15,
      marginTop: ".5in",
      // alignItems: "center", // Center the columns vertically
      // justifyContent: "space-around", // Add space around columns
    },

    column: {
      flex: 1,
      alignItems: "center",
    },

    columnContent: {
      justifyContent: "center", // Center content vertically
      alignItems: "center", // Center content horizontally
      // border: "1 solid black", // Example border
      // padding: 10, // Example padding
    },

    tableHeader: {
      display: "flex",
      flexDirection: "row",
      textAlign: "center",
      borderBottom: "0.4px solid grey",
      paddingTop: 3,
      paddingBottom: 3,
      fontSize: 10,
      flexWrap: "wrap",
      wordWrap: "break-word",
    },
    tableData: {
      display: "flex",
      flexDirection: "row",
      textAlign: "center",
      borderBottom: "0.4px solid grey",
      paddingTop: 3,
      paddingBottom: 3,
      fontSize: "10pt",
      flexWrap: "wrap",
      wordWrap: "break-word",
    },

    title: {
      fontSize: 18,
      marginBottom: 20,
      fontFamily: "Roboto Bold",
    },
    content: {
      fontSize: 12,
    },

    userInfo: {
      display: "flex",
      flexDirection: "row",
      fontSize: "11pt",
      flexWrap: "wrap",
      wordWrap: "break-word",
    },
    userInfoColumn: {
      flex: 1,
    },

    table: {
      display: "table",
      width: "100%",
      borderStyle: "solid",
      borderWidth: 1,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    tableRow: {
      margin: "auto",
      flexDirection: "row",
    },
    tableCol: {
      width: "25%",
      borderStyle: "solid",
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
    },
    cell: {
      margin: "auto",
      marginTop: 5,
    },
    colspanCell: {
      margin: "auto",
      marginTop: 5,
      width: "50%",
      borderStyle: "solid",
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
    },

    line: {
      borderBottomWidth: 2,
      borderColor: "black",
      width: "100%",
    },

    container: {
      display: "flex",
    },

    pagecolumn: {
      flex: 1,
      padding: "20px",
    },

    column1: {
      flex: "40%",
      backgroundColor: "#f0f0f0",
    },

    column2: {
      flex: "60%",
      backgroundColor: "#e0e0e0",
    },
  });

  const col1 = ["", "AM", "PM", "UNDERTIME"];
  const col2 = ["", "Date", "IN1", "OUT1", "IN2", "OUT2", "Hours", "Min"];

  const col3 = ["Field", ":", "Data"];

  return (
    <>
      <div className="container">
        <div className="my-2">
          <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls" />
        </div>

        <hr />
        <PDFViewer
          style={{
            width: "100%",
            height: "100vh",
          }}
        >
          <Document
            title="Daily Time Record"
            keywords="document, pdf"
            subject="DTR"
            pdfVersion="1.3"
          >
            {data.map((row, index) => (
              <Page
                key={index}
                size="A4"
                style={{
                  ...styles.page,
                }}
              >
                {/* left column */}
                <View
                  style={{
                    ...styles.column,
                    marginRight: 8,
                  }}
                  fixed
                >
                  <View style={styles.columnContent}>
                    <Text
                      style={{
                        ...styles.title,
                        textAlign: "center",
                        marginBottom: 10,
                      }}
                    >
                      DAILY TIME RECORD
                    </Text>

                    <View style={styles.userInfo} fixed>
                      {col3.map((c, index) => (
                        <>
                          {c === "Field" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col1.length}%`,
                                textAlign: "right",
                              }}
                            >
                              NAME
                            </Text>
                          )}
                          {c === ":" && (
                            <Text
                              key={index}
                              style={{
                                width: `${10 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                          {c === "Data" && (
                            <Text
                              key={index}
                              style={{
                                width: `${150 / col1.length}%`,
                              }}
                            >
                              {row.employeeName}
                            </Text>
                          )}
                        </>
                      ))}
                    </View>
                    <View style={styles.userInfo} fixed>
                      {col3.map((c, index) => (
                        <>
                          {c === "Field" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col1.length}%`,
                                textAlign: "right",
                              }}
                            >
                              PERIOD
                            </Text>
                          )}
                          {c === ":" && (
                            <Text
                              key={index}
                              style={{
                                width: `${10 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                          {c === "Data" && (
                            <Text
                              key={index}
                              style={{
                                width: `${150 / col1.length}%`,
                              }}
                            >
                              {new Date(row.startDate).toLocaleString(
                                "default",
                                { month: "long" }
                              )}{" "}
                              {("0" + new Date(row.startDate).getDate()).slice(
                                -2
                              )}{" "}
                              -{" "}
                              {("0" + new Date(row.endDate).getDate()).slice(
                                -2
                              )}
                              , {new Date(row.startDate).getFullYear()}
                            </Text>
                          )}
                        </>
                      ))}
                    </View>

                    <View style={styles.userInfo} fixed>
                      {col3.map((c, index) => (
                        <>
                          {c === "Field" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col1.length}%`,
                                textAlign: "right",
                                marginRight: 5,
                              }}
                            >
                              Official Hours
                            </Text>
                          )}
                          {c === ":" && (
                            <Text
                              key={index}
                              style={{
                                width: `${10 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                          {c === "Data" && (
                            <Text
                              key={index}
                              style={{
                                width: `${150 / col1.length}%`,
                                borderBottom: "1px solid black",
                              }}
                            ></Text>
                          )}
                        </>
                      ))}
                    </View>

                    <View
                      style={{
                        ...styles.tableHeader,
                        borderTop: "0.5px",
                        borderTopColor: "black",
                        marginTop: 2,
                        borderBottom: "0.5px",
                        borderBottomColor: "black",
                      }}
                      fixed
                    >
                      {col1.map((c, index) => (
                        <>
                          {c === "" && (
                            <Text
                              key={index}
                              style={{
                                width: `${40 / col1.length}%`,
                              }}
                            ></Text>
                          )}
                          {c === "AM" && (
                            <Text
                              key={index}
                              style={{
                                width: `${130 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                          {c === "PM" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                          {c === "UNDERTIME" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                        </>
                      ))}
                    </View>

                    <View style={styles.tableHeader} fixed>
                      {col2.map((c, index) => (
                        <>
                          {c === "Date" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col2.length}%`,
                              }}
                            >
                              Date
                            </Text>
                          )}
                          {c === "IN1" && (
                            <Text
                              key={index}
                              style={{
                                width: `${110 / col2.length}%`,
                                marginLeft: 12,
                              }}
                            >
                              IN
                            </Text>
                          )}
                          {c === "OUT1" && (
                            <Text
                              key={index}
                              style={{
                                width: `${110 / col2.length}%`,
                              }}
                            >
                              OUT
                            </Text>
                          )}
                          {c === "IN2" && (
                            <Text
                              key={index}
                              style={{
                                width: `${110 / col2.length}%`,
                              }}
                            >
                              IN
                            </Text>
                          )}
                          {c === "OUT2" && (
                            <Text
                              key={index}
                              style={{
                                width: `${110 / col2.length}%`,
                              }}
                            >
                              OUT
                            </Text>
                          )}
                          {c === "Hours" && (
                            <Text
                              key={index}
                              style={{
                                width: `${90 / col2.length}%`,
                              }}
                            >
                              Hours
                            </Text>
                          )}
                          {c === "Min" && (
                            <Text
                              key={index}
                              style={{
                                width: `${110 / col2.length}%`,
                              }}
                            >
                              Min
                            </Text>
                          )}
                        </>
                      ))}
                    </View>
                    <Svg height="5" width="265">
                      <Line
                        x1="0"
                        y1="5"
                        x2="280"
                        y2="5"
                        strokeWidth={1}
                        stroke="rgb(0,0,0)"
                      />
                    </Svg>
                    {Object.values(row._logs).map((row, index) => (
                      <View style={styles.tableData} fixed>
                        {col2.map((c, rowIndex) => (
                          <>
                            {c === "Date" && (
                              <Text
                                key={rowIndex}
                                style={{
                                  width: `${130 / col2.length}%`,
                                  textAlign: "left",
                                }}
                              >
                                {("0" + new Date(row.date).getDate()).slice(-2)}{" "}
                                {new Intl.DateTimeFormat("en-US", {
                                  weekday: "short",
                                }).format(new Date(row.date))}
                              </Text>
                            )}
                            {c === "IN1" && (
                              <Text
                                key={rowIndex}
                                style={{ width: `${100 / col2.length}%` }}
                              >
                                {row._time.login}
                              </Text>
                            )}
                            {c === "OUT1" && (
                              <Text
                                key={rowIndex}
                                style={{ width: `${100 / col2.length}%` }}
                              ></Text>
                            )}
                            {c === "IN2" && (
                              <Text
                                key={rowIndex}
                                style={{ width: `${100 / col2.length}%` }}
                              ></Text>
                            )}
                            {c === "OUT2" && (
                              <Text
                                key={rowIndex}
                                style={{
                                  width: `${100 / col2.length}%`,
                                  marginLeft: 12,
                                }}
                              >
                                {row._time.logout}
                              </Text>
                            )}
                            {c === "Hours" && (
                              <Text
                                key={rowIndex}
                                style={{ width: `${100 / col2.length}%` }}
                              ></Text>
                            )}
                            {c === "Min" && (
                              <Text
                                key={rowIndex}
                                style={{ width: `${100 / col2.length}%` }}
                              ></Text>
                            )}
                            {/* 
                            <Text
                              key={index}
                              style={{
                                width: `${90 / col2.length}%`,
                              }}
                            >
                              {row._time.login}
                            </Text>
                            <Text
                              key={index}
                              style={{
                                width: `${90 / col2.length}%`,
                              }}
                            >
                              {row._time.logout}
                            </Text> */}
                            {/* <td>{new Date(row.date).getDate()} </td>
                    <td>
                      {new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                      }).format(new Date(row.date))}
                    </td>
                    <td>{row._time.login}</td>
                    <td> </td>
                    <td> </td>
                    <td>{row._time.logout}</td>
                    <td> </td>
                    <td> </td> */}
                          </>
                        ))}
                      </View>
                    ))}
                    <Svg height="5" width="265">
                      <Line
                        x1="0"
                        y1="5"
                        x2="280"
                        y2="5"
                        strokeWidth={1}
                        stroke="rgb(0,0,0)"
                      />
                    </Svg>

                    <Text
                      style={{
                        textIndent: 12,
                        fontFamily: "Roboto Bold",
                        fontSize: 10,
                        marginTop: 30,
                      }}
                    >
                      I certify on my honor that the above is a true and correct
                      report of the hours of work performed, record of which was
                      made daily at the time of arrival and departure from
                      office.
                    </Text>
                    <View
                      style={{
                        marginTop: 40,
                        marginBottom: 15,
                      }}
                    >
                      <Svg height="5" width="265">
                        <Line
                          x1="0"
                          y1="5"
                          x2="280"
                          y2="5"
                          strokeWidth={1}
                          stroke="rgb(0,0,0)"
                        />
                      </Svg>
                    </View>

                    <Text style={{ fontSize: 10, textAlign: "center" }}>
                      Verified as to the prescribed office hours
                    </Text>
                    <Text
                      style={{
                        textAlign: "center",
                        marginTop: 40,
                        fontSize: 10,
                        fontFamily: "Roboto Bold",
                      }}
                    >
                      Elizer T. Bugas
                    </Text>
                    <View style={{}}>
                      <Svg height="5" width="265">
                        <Line
                          x1="0"
                          y1="5"
                          x2="280"
                          y2="5"
                          strokeWidth={1}
                          stroke="rgb(0,0,0)"
                        />
                      </Svg>
                    </View>
                    <View
                      style={{
                        marginTop: 40,
                        marginBottom: 15,
                      }}
                    >
                      <Svg height="5" width="265">
                        <Line
                          x1="0"
                          y1="5"
                          x2="280"
                          y2="5"
                          strokeWidth={1}
                          stroke="rgb(0,0,0)"
                        />
                      </Svg>
                    </View>
                  </View>
                </View>

                {/* Right column */}
                <View
                  style={{
                    ...styles.column,
                    marginRight: 8,
                  }}
                  fixed
                >
                  <View style={styles.columnContent}>
                    <Text
                      style={{
                        ...styles.title,
                        textAlign: "center",
                        marginBottom: 7,
                      }}
                    >
                      DAILY TIME RECORD
                    </Text>

                    <View style={styles.userInfo} fixed>
                      {col3.map((c, index) => (
                        <>
                          {c === "Field" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col1.length}%`,
                                textAlign: "left",
                              }}
                            >
                              NAME
                            </Text>
                          )}
                          {c === ":" && (
                            <Text
                              key={index}
                              style={{
                                width: `${10 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                          {c === "Data" && (
                            <Text
                              key={index}
                              style={{
                                width: `${150 / col1.length}%`,
                              }}
                            >
                              {row.employeeName}
                            </Text>
                          )}
                        </>
                      ))}
                    </View>
                    <View style={styles.userInfo} fixed>
                      {col3.map((c, index) => (
                        <>
                          {c === "Field" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col1.length}%`,
                                textAlign: "left",
                              }}
                            >
                              PERIOD
                            </Text>
                          )}
                          {c === ":" && (
                            <Text
                              key={index}
                              style={{
                                width: `${10 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                          {c === "Data" && (
                            <Text
                              key={index}
                              style={{
                                width: `${150 / col1.length}%`,
                              }}
                            >
                              {new Date(row.startDate).toLocaleString(
                                "default",
                                { month: "long" }
                              )}{" "}
                              {("0" + new Date(row.startDate).getDate()).slice(
                                -2
                              )}{" "}
                              -{" "}
                              {("0" + new Date(row.endDate).getDate()).slice(
                                -2
                              )}
                              , {new Date(row.startDate).getFullYear()}
                            </Text>
                          )}
                        </>
                      ))}
                    </View>

                    <View style={styles.userInfo} fixed>
                      {col3.map((c, index) => (
                        <>
                          {c === "Field" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col1.length}%`,
                                textAlign: "left",
                              }}
                            >
                              Official Hours
                            </Text>
                          )}
                          {c === ":" && (
                            <Text
                              key={index}
                              style={{
                                width: `${10 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                          {c === "Data" && (
                            <Text
                              key={index}
                              style={{
                                width: `${150 / col1.length}%`,
                                borderBottom: "1px solid black",
                              }}
                            ></Text>
                          )}
                        </>
                      ))}
                    </View>

                    <View
                      style={{
                        ...styles.tableHeader,
                        borderTop: "0.5px",
                        borderTopColor: "black",
                        marginTop: 2,
                        borderBottom: "0.5px",
                        borderBottomColor: "black",
                      }}
                      fixed
                    >
                      {col1.map((c, index) => (
                        <>
                          {c === "" && (
                            <Text
                              key={index}
                              style={{
                                width: `${40 / col1.length}%`,
                              }}
                            ></Text>
                          )}
                          {c === "AM" && (
                            <Text
                              key={index}
                              style={{
                                width: `${130 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                          {c === "PM" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                          {c === "UNDERTIME" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col1.length}%`,
                              }}
                            >
                              {c}
                            </Text>
                          )}
                        </>
                      ))}
                    </View>

                    <View style={styles.tableHeader} fixed>
                      {col2.map((c, index) => (
                        <>
                          {c === "Date" && (
                            <Text
                              key={index}
                              style={{
                                width: `${100 / col2.length}%`,
                              }}
                            >
                              Date
                            </Text>
                          )}
                          {c === "IN1" && (
                            <Text
                              key={index}
                              style={{
                                width: `${110 / col2.length}%`,
                                marginLeft: 12,
                              }}
                            >
                              IN
                            </Text>
                          )}
                          {c === "OUT1" && (
                            <Text
                              key={index}
                              style={{
                                width: `${110 / col2.length}%`,
                              }}
                            >
                              OUT
                            </Text>
                          )}
                          {c === "IN2" && (
                            <Text
                              key={index}
                              style={{
                                width: `${110 / col2.length}%`,
                              }}
                            >
                              IN
                            </Text>
                          )}
                          {c === "OUT2" && (
                            <Text
                              key={index}
                              style={{
                                width: `${110 / col2.length}%`,
                              }}
                            >
                              OUT
                            </Text>
                          )}
                          {c === "Hours" && (
                            <Text
                              key={index}
                              style={{
                                width: `${90 / col2.length}%`,
                              }}
                            >
                              Hours
                            </Text>
                          )}
                          {c === "Min" && (
                            <Text
                              key={index}
                              style={{
                                width: `${110 / col2.length}%`,
                              }}
                            >
                              Min
                            </Text>
                          )}
                        </>
                      ))}
                    </View>
                    <Svg height="5" width="265">
                      <Line
                        x1="0"
                        y1="5"
                        x2="280"
                        y2="5"
                        strokeWidth={1}
                        stroke="rgb(0,0,0)"
                      />
                    </Svg>
                    {Object.values(row._logs).map((row, index) => (
                      <View style={styles.tableData} fixed>
                        {col2.map((c, rowIndex) => (
                          <>
                            {c === "Date" && (
                              <Text
                                key={rowIndex}
                                style={{
                                  width: `${130 / col2.length}%`,
                                  textAlign: "left",
                                }}
                              >
                                {("0" + new Date(row.date).getDate()).slice(-2)}{" "}
                                {new Intl.DateTimeFormat("en-US", {
                                  weekday: "short",
                                }).format(new Date(row.date))}
                              </Text>
                            )}
                            {c === "IN1" && (
                              <Text
                                key={rowIndex}
                                style={{ width: `${100 / col2.length}%` }}
                              >
                                {row._time.login}
                              </Text>
                            )}
                            {c === "OUT1" && (
                              <Text
                                key={rowIndex}
                                style={{ width: `${100 / col2.length}%` }}
                              ></Text>
                            )}
                            {c === "IN2" && (
                              <Text
                                key={rowIndex}
                                style={{ width: `${100 / col2.length}%` }}
                              ></Text>
                            )}
                            {c === "OUT2" && (
                              <Text
                                key={rowIndex}
                                style={{
                                  width: `${100 / col2.length}%`,
                                  marginLeft: 12,
                                }}
                              >
                                {row._time.logout}
                              </Text>
                            )}
                            {c === "Hours" && (
                              <Text
                                key={rowIndex}
                                style={{ width: `${100 / col2.length}%` }}
                              ></Text>
                            )}
                            {c === "Min" && (
                              <Text
                                key={rowIndex}
                                style={{ width: `${100 / col2.length}%` }}
                              ></Text>
                            )}
                            {/* 
                            <Text
                              key={index}
                              style={{
                                width: `${90 / col2.length}%`,
                              }}
                            >
                              {row._time.login}
                            </Text>
                            <Text
                              key={index}
                              style={{
                                width: `${90 / col2.length}%`,
                              }}
                            >
                              {row._time.logout}
                            </Text> */}
                            {/* <td>{new Date(row.date).getDate()} </td>
                    <td>
                      {new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                      }).format(new Date(row.date))}
                    </td>
                    <td>{row._time.login}</td>
                    <td> </td>
                    <td> </td>
                    <td>{row._time.logout}</td>
                    <td> </td>
                    <td> </td> */}
                          </>
                        ))}
                      </View>
                    ))}
                    <Svg height="5" width="265">
                      <Line
                        x1="0"
                        y1="5"
                        x2="280"
                        y2="5"
                        strokeWidth={1}
                        stroke="rgb(0,0,0)"
                      />
                    </Svg>

                    <Text
                      style={{
                        textIndent: 12,
                        fontFamily: "Roboto Bold",
                        fontSize: 10,
                        marginTop: 30,
                      }}
                    >
                      I certify on my honor that the above is a true and correct
                      report of the hours of work performed, record of which was
                      made daily at the time of arrival and departure from
                      office.
                    </Text>
                    <View
                      style={{
                        marginTop: 40,
                        marginBottom: 15,
                      }}
                    >
                      <Svg height="5" width="265">
                        <Line
                          x1="0"
                          y1="5"
                          x2="280"
                          y2="5"
                          strokeWidth={1}
                          stroke="rgb(0,0,0)"
                        />
                      </Svg>
                    </View>

                    <Text style={{ fontSize: 10, textAlign: "center" }}>
                      Verified as to the prescribed office hours
                    </Text>
                    <Text
                      style={{
                        textAlign: "center",
                        marginTop: 40,
                        fontSize: 10,
                        fontFamily: "Roboto Bold",
                      }}
                    >
                      Elizer T. Bugas
                    </Text>
                    <View style={{}}>
                      <Svg height="5" width="265">
                        <Line
                          x1="0"
                          y1="5"
                          x2="280"
                          y2="5"
                          strokeWidth={1}
                          stroke="rgb(0,0,0)"
                        />
                      </Svg>
                    </View>
                    <View
                      style={{
                        marginTop: 40,
                        marginBottom: 15,
                      }}
                    >
                      <Svg height="5" width="265">
                        <Line
                          x1="0"
                          y1="5"
                          x2="280"
                          y2="5"
                          strokeWidth={1}
                          stroke="rgb(0,0,0)"
                        />
                      </Svg>
                    </View>
                  </View>
                </View>
              </Page>
            ))}
          </Document>
        </PDFViewer>

        {data.map((row, index) => (
          <div key={index}>
            <p>
              Name: {row.employeeName} <br />
              PERIOD: {row.employeeDept} <br />
              Official Hours: _____________
              <br />
            </p>
            <table>
              <tr>
                <td colSpan={2}></td>
                <td colSpan={2}>AM</td>
                <td colSpan={2}>PM</td>
              </tr>
              <tr>
                <td colSpan={2}>Date</td>
                <td>IN</td>
                <td>OUT</td>
                <td>IN</td>
                <td>OUT</td>
                <td>HOURS</td>
                <td>MINUTE</td>
              </tr>
              <tbody>
                {Object.values(row._logs).map((row, index) => (
                  <tr key={index}>
                    <td>{new Date(row.date).getDate()} </td>
                    <td>
                      {new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                      }).format(new Date(row.date))}
                    </td>
                    <td>{row._time.login}</td>
                    <td> </td>
                    <td> </td>
                    <td>{row._time.logout}</td>
                    <td> </td>
                    <td> </td>
                  </tr>
                ))}
                <tr key={index}>
                  <td colSpan={6}>Total UnderTime </td>
                  <td></td>
                  <td> </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
};

export default App;
