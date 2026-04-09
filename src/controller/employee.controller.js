


// ADD EMPLOYEE DETAILS (ONLY LOGGED-IN EMPLOYEE)
exports.addEmployeeDetails = async (req, res) => {
  try {
    const emp_id = req.user.id; // from JWT

    const {
      dob,
      perm_addr,
      work_addr,
      comm_addr,
      aadhar_no,
      pan_card,
      phone_no_pri,
      phone_no_sec,
    } = req.body;

    //  check if already exists (1:1 relation)
    const existing = await prisma.employeeDetails.findUnique({
      where: { emp_id },
    });

    if (existing) {
      return res.status(400).json({
        message: "Details already exist. Use update API",
      });
    }

    const details = await prisma.employeeDetails.create({
      data: {
        emp_id,
        dob: new Date(dob),
        perm_addr,
        work_addr,
        comm_addr,
        aadhar_no,
        pan_card,
        phone_no_pri,
        phone_no_sec,
      },
    });

    res.json({
      message: "Employee details added successfully",
      details,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//update employee details can be implemented similarly to addEmployeeDetails, with an additional check to ensure the record exists before updating.
exports.updateEmployeeDetails = async (req, res) => {
  try {
    const emp_id = req.user.id; // from JWT

    const {
      dob,
      perm_addr,
      work_addr,
      comm_addr,
      aadhar_no,
      pan_card,
      phone_no_pri,
      phone_no_sec,
    } = req.body;

    //  check if already exists (1:1 relation)
    const existing = await prisma.employeeDetails.findUnique({
      where: { emp_id },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Employee details not found",
      });
    }

    const details = await prisma.employeeDetails.update({
      where: { emp_id },
      data: {
        dob: new Date(dob),
        perm_addr,
        work_addr,
        comm_addr,
        aadhar_no,
        pan_card,
        phone_no_pri,
        phone_no_sec,
      },
    });

    res.json({
      message: "Employee details updated successfully",
      details,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
