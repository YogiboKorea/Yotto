const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const excelJS = require("exceljs");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4100;
const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "Yotto";
const COLLECTION_NAME = "Participation";

const winningNumber = process.env.WINNING_NUMBER;
const secondPrizeNumber = process.env.SECOND_NUMBER;
const thirdPrizeNumber = process.env.THIRD_NUMBER;

// JSON 파일에서 loserNumbers 가져오기
let loserNumbers = new Set();
try {
  const jsonData = JSON.parse(fs.readFileSync("loser_numbers.json", "utf-8"));
  loserNumbers = new Set(jsonData.loserNumbers);
  console.log("JSON 파일에서 불러온 LOSER_NUMBER 목록:", Array.from(loserNumbers).slice(0, 5000)); // 샘플 출력
} catch (error) {
  console.error("loser_numbers.json 파일 읽기 오류:", error);
  process.exit(1);
}

// 필수 환경 변수 검증
if (!uri || !winningNumber || !secondPrizeNumber || !thirdPrizeNumber || loserNumbers.size === 0) {
  console.error("필수 환경 변수가 누락되었습니다.");
  process.exit(1);
}

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;
client.connect()
  .then(() => {
    console.log("✅ MongoDB 연결 성공");
    db = client.db(dbName);
  })
  .catch((err) => {
    console.error("MongoDB 연결 실패:", err);
    process.exit(1);
  });

app.use(cors());
app.use(bodyParser.json());

// 참여 API
app.post("/api/participate", async (req, res) => {
  try {
    const { memberId, selectedStore, enteredNumber } = req.body;

    if (!memberId || typeof memberId !== "string" || !selectedStore || typeof selectedStore !== "string" || !/^\d{6}$/.test(enteredNumber)) {
      return res.status(400).json({ message: "올바른 입력값이 아닙니다." });
    }

    const collection = db.collection(COLLECTION_NAME);
    // const existingEntry = await collection.findOne({ memberId, selectedStore, enteredNumber });
    // if (existingEntry) {
    //   return res.status(400).json({ message: "이미 참여한 기록이 있는 번호입니다." });
    // }

    let isWinner = false;
    let prizeType = "미당첨";
    let resultMessage = "아쉽지만 당첨되지 않았습니다.";

    if (enteredNumber === winningNumber) {
      isWinner = true;
      prizeType = "1등";
      resultMessage = "🎉 축하합니다! 1등 당첨되셨습니다!";
    } else if (enteredNumber === secondPrizeNumber) {
      isWinner = true;
      prizeType = "2등";
      resultMessage = "🎉 축하합니다! 2등 당첨되셨습니다!";
    } else if (enteredNumber === thirdPrizeNumber) {
      isWinner = true;
      prizeType = "3등";
      resultMessage = "🎉 축하합니다! 3등 당첨되셨습니다!";
    } else if (loserNumbers.has(enteredNumber)) {
      prizeType = "탈락";
      resultMessage = "아쉽지만 당첨되지 않았습니다.";
    } else {
      return res.status(400).json({ message: "입력된 번호가 유효하지 않습니다." });
    }

    const participationDate = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });

    const participationData = {
      participationDate,
      memberId,
      selectedStore,
      enteredNumber,
      isWinner,
      prizeType,
    };

    await collection.insertOne(participationData);

    res.status(200).json({
      message: resultMessage,
      isWinner,
      prizeType,
    });
  } catch (error) {
    console.error("참여 처리 중 오류:", error);
    res.status(500).json({ message: "서버 오류. 다시 시도해주세요." });
  }
});

// 엑셀 다운로드 API
app.get("/api/export", async (req, res) => {
  try {
    const collection = db.collection(COLLECTION_NAME);
    const data = await collection.find({}).toArray();

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("참여 데이터");

    worksheet.columns = [
      { header: "참여 날짜", key: "participationDate", width: 15 },
      { header: "회원 ID", key: "memberId", width: 20 },
      { header: "선택 매장", key: "selectedStore", width: 20 },
      { header: "입력 번호", key: "enteredNumber", width: 15 },
      { header: "당첨 여부", key: "isWinner", width: 10 },
      { header: "당첨 유형", key: "prizeType", width: 15 },
    ];

    data.forEach((record) => {
      worksheet.addRow({
        ...record,
        isWinner: record.isWinner ? "당첨" : "탈락",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="participation_data.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("엑셀 파일 생성 오류:", error);
    res.status(500).json({ message: "엑셀 파일 생성 중 오류가 발생했습니다." });
  }
});

// 당첨 번호 제공 API
app.get("/api/winning-numbers", (req, res) => {
  try {
    const data = {
      firstPrize: winningNumber,
      secondPrize: secondPrizeNumber,
      thirdPrize: thirdPrizeNumber,
      loserNumbers: Array.from(loserNumbers),
    };
    res.status(200).json(data);
  } catch (error) {
    console.error("당첨 번호 가져오기 오류:", error);
    res.status(500).json({ message: "서버 오류. 다시 시도해주세요." });
  }
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
