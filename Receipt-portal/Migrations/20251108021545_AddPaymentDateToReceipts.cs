using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subh_sankalp_estate.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentDateToReceipts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PaymentDate",
                table: "Receipts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 8, 2, 15, 44, 554, DateTimeKind.Utc).AddTicks(6044), "$2a$11$g9SE.1McKN8v.KKrZ3nzquT266uBkZ70nYUDQb9ZP84McgkGhLt8i", new DateTime(2025, 11, 8, 2, 15, 44, 554, DateTimeKind.Utc).AddTicks(6050) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentDate",
                table: "Receipts");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 6, 7, 14, 18, 549, DateTimeKind.Utc).AddTicks(3443), "$2a$11$EZJ6qaSK1oD5k6VnXQml4O0tNg76fi42jTjDPhMURs2/V98Xq89ea", new DateTime(2025, 11, 6, 7, 14, 18, 549, DateTimeKind.Utc).AddTicks(3446) });
        }
    }
}
