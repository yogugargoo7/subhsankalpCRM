BEGIN TRANSACTION;
GO

CREATE TABLE [Customers] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(255) NOT NULL,
    [Email] nvarchar(255) NOT NULL,
    [password] nvarchar(20) NOT NULL,
    [PlotNumber] nvarchar(100) NOT NULL,
    [SiteName] nvarchar(255) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Customers] PRIMARY KEY ([Id])
);
GO

-- This updates the history so EF doesn't try to run this again
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260220055055_AddCustomerTable', N'8.0.0');
GO

COMMIT;
GO