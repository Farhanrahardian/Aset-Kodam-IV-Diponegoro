import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, Spinner } from "react-bootstrap";
import koremData from "../data/korem.json";

const AsetByKoremChart = () => {
  const [asetByKorem, setAsetByKorem] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:3001/assets");
        const data = await res.json();

        const koremCounts = data.reduce((acc, curr) => {
          const koremId = curr.korem_id;
          if (koremId) {
            if (!acc[koremId]) {
              const korem = koremData.find((k) => k.id == koremId);
              const koremName = korem ? korem.nama : `Korem ID ${koremId}`;
              acc[koremId] = { name: koremName, jumlah: 0 };
            }
            acc[koremId].jumlah++;
          }
          return acc;
        }, {});
        setAsetByKorem(Object.values(koremCounts));
      } catch (error) {
        console.error("Gagal mengambil data aset per korem:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="chart-card h-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" />
      </Card>
    );
  }

  return (
    <Card className="chart-card h-100">
      <Card.Body>
        <Card.Title>Jumlah Aset Tiap Korem</Card.Title>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={asetByKorem} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(value) => Math.floor(value)}
              allowDecimals={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={180} // Menyesuaikan lebar untuk menghindari tabrakan
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={(value) => Math.floor(value)} />
            <Bar dataKey="jumlah" fill="#82ca9d" name="Jumlah Aset" />
          </BarChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
};

export default AsetByKoremChart;
